const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { hashPassword } = require('../lib/auth');

const INTERNAL_TOKEN = 'test-internal-token-0123456789abcdef0123456789';
const ORG_A = 'http://localhost:3335/';
const ORG_A_CATALOG = 'http://catalog/participants/a';
const ORG_B = 'http://localhost:3339/';
const PASSWORD_A = 'password-of-org-a';
const PASSWORD_B = 'password-of-org-b';

process.env.DVCT_INTERNAL_API_TOKEN = INTERNAL_TOKEN;
process.env.DVCT_LOGIN_MAX_FAILURES = '3';
process.env.DVCT_CORS_ORIGINS = 'http://allowed.example';
process.env.DVCT_ORGANIZATIONS_JSON = JSON.stringify([
  {
    organizationId: ORG_A,
    displayName: 'Organization A',
    aliases: [ORG_A_CATALOG],
    users: [{ username: 'orga', passwordHash: hashPassword(PASSWORD_A) }],
  },
  {
    organizationId: ORG_B,
    displayName: 'Organization B',
    users: [
      { username: 'orgb', passwordHash: hashPassword(PASSWORD_B) },
      // Dedicated to the throttling test, which leaves this user locked out.
      { username: 'orgb-throttled', passwordHash: hashPassword(PASSWORD_B) },
    ],
  },
]);

const app = require('../app');
const Data = require('../models/data');
const IncentiveUseCaseMetadata = require('../models/incentiveUseCaseMetadata');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Data.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  await Data.createIndexes();
});

const nodePayload = (overrides = {}) => ({
  dvctId: 'dvct123',
  usecaseContractId: 'usecase-1',
  usecaseContractTitle: 'Test Contract',
  contractId: 'contract123',
  dataId: 'data123',
  participantId: ORG_B,
  participantSourceId: ORG_B,
  participantShare: 10,
  dataProviderId: ORG_A,
  dataConsumerId: ORG_B,
  dataConsumerIsAIProvider: true,
  prevDataId: [`trace-node:usecase-1:data123:${ORG_A}`],
  incentiveForDataProvider: { numPoints: 20, factor: 1, factorCheck: true },
  extraIncentiveForAIProvider: { numPoints: 10, factor: 1, factorCheck: true },
  ...overrides,
});

const postNode = (payload) =>
  request(app).post('/api/node').set('X-DVCT-Internal-Token', INTERNAL_TOKEN).send(payload);

const login = async (username, password) => {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ username, password });
  expect(response.status).toBe(200);
  return agent;
};

describe('POST /api/node', () => {
  it('rejects writes without the internal token', async () => {
    const response = await request(app).post('/api/node').send(nodePayload());
    expect(response.status).toBe(401);
    expect(await Data.countDocuments()).toBe(0);
  });

  it('creates the consumer node and the referenced provider node', async () => {
    const response = await postNode(nodePayload());

    expect(response.status).toBe(201);
    expect(response.body.data.canonicalKey).toBe(`trace-node:usecase-1:data123:${ORG_B}`);
    expect(response.body.data.prevNode[0]['@nodeUrl']).toContain('/api/data/');

    const provider = await Data.findOne({ canonicalKey: `trace-node:usecase-1:data123:${ORG_A}` });
    expect(provider.childNode.map((link) => link.nodeId)).toContain(response.body.data.canonicalKey);
  });

  it('reuses the canonical node for repeated and concurrent events', async () => {
    await Promise.all([postNode(nodePayload()), postNode(nodePayload()), postNode(nodePayload())]);
    expect(await Data.countDocuments({ canonicalKey: `trace-node:usecase-1:data123:${ORG_B}` })).toBe(1);
    expect(await Data.countDocuments({ canonicalKey: `trace-node:usecase-1:data123:${ORG_A}` })).toBe(1);
  });

  it('rejects invalid payloads', async () => {
    const response = await postNode(nodePayload({ prevDataId: [{ $ne: null }], participantShare: -1 }));
    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(
      expect.arrayContaining(['participantShare must be a non-negative number', 'prevDataId must be an array of strings']),
    );
  });

  it('returns 400 if there is no canonical identity in the payload', async () => {
    const response = await postNode({});
    expect(response.status).toBe(400);
  });
});

describe('shared data sources', () => {
  const RESOURCE = 'https://catalog/dataresources/r1';
  const sourceNode = (dvctId, points) =>
    nodePayload({
      nodeScope: 'data-source',
      dvctId,
      usecaseContractId: `chain-${dvctId}`,
      dataId: RESOURCE,
      participantId: ORG_A,
      participantSourceId: ORG_A,
      dataProviderId: ORG_A,
      dataConsumerId: ORG_B,
      dataConsumerIsAIProvider: false,
      participantShare: points,
      prevDataId: [],
    });
  const branch = (dvctId) =>
    nodePayload({
      dvctId,
      usecaseContractId: `chain-${dvctId}`,
      dataId: `${dvctId}/step-1`,
      prevDataId: [`trace-source:${RESOURCE}:${ORG_A}`],
    });

  it('keeps one node per data resource with parallel branches and points per exchange', async () => {
    await postNode(sourceNode('dx1', 30)).expect(201);
    await postNode(branch('dx1')).expect(201);
    await postNode(sourceNode('dx2', 20)).expect(201);
    await postNode(branch('dx2')).expect(201);
    // Repeating an exchange does not add its points twice.
    await postNode(sourceNode('dx1', 30)).expect(201);

    const sources = await Data.find({ canonicalKey: `trace-source:${RESOURCE}:${ORG_A}` }).lean();
    expect(sources).toHaveLength(1);
    expect(sources[0].childNode).toHaveLength(2);
    const points = sources[0].nodeMetadata.incentiveReceivedFrom.reduce((sum, entry) => sum + entry.numPoints, 0);
    expect(points).toBe(50);

    const agent = await login('orga', PASSWORD_A);
    const tree = await agent.get(`/api/node-tree/${encodeURIComponent(`trace-source:${RESOURCE}:${ORG_A}`)}`).expect(200);
    expect(tree.body.childNode).toHaveLength(2);
  });

  it('updates the same nodes when the same service chain runs again', async () => {
    const run = (dvctId, points) =>
      nodePayload({
        dvctId,
        usecaseContractId: 'chain-1',
        dataId: 'step-1',
        participantShare: points,
        prevDataId: [],
      });
    await postNode(run('dx1', 30)).expect(201);
    await postNode(run('dx2', 20)).expect(201);
    await postNode(run('dx2', 20)).expect(201); // the same exchange again: no change

    const nodes = await Data.find({ 'nodeMetadata.usecaseContractId': 'chain-1' }).lean();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].executions.map((execution) => execution.dvctId)).toEqual(['dx1', 'dx2']);
    expect(nodes[0].nodeMetadata.incentiveReceivedFrom.reduce((sum, entry) => sum + entry.numPoints, 0)).toBe(50);
  });

  it('rejects an unknown nodeScope', async () => {
    await postNode(nodePayload({ nodeScope: 'everything' })).expect(400);
  });
});

describe('authentication', () => {
  it('signs in with valid credentials and exposes the profile', async () => {
    const agent = await login('orga', PASSWORD_A);
    const response = await agent.get('/api/auth/me');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ username: 'orga', organizationId: ORG_A, displayName: 'Organization A' });
  });

  it('sets a hardened session cookie', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: 'orga', password: PASSWORD_A });
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly; SameSite=Strict; Path=\//);
  });

  it('rejects wrong passwords and throttles repeated failures', async () => {
    for (let i = 0; i < 3; i++) {
      const response = await request(app).post('/api/auth/login').send({ username: 'orgb-throttled', password: 'wrong' });
      expect(response.status).toBe(401);
    }
    const throttled = await request(app).post('/api/auth/login').send({ username: 'orgb-throttled', password: PASSWORD_B });
    expect(throttled.status).toBe(429);
  });

  it('rejects cross-site sign-in requests', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://evil.example')
      .send({ username: 'orga', password: PASSWORD_A });
    expect(response.status).toBe(403);
  });

  it('invalidates the session on logout', async () => {
    const agent = await login('orga', PASSWORD_A);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('requires a session for graph endpoints', async () => {
    await request(app).get('/api/data').expect(401);
    await request(app).get('/api/data/anything').expect(401);
    await request(app).get('/api/node-tree/anything').expect(401);
  });
});

describe('organization-scoped graph access', () => {
  beforeEach(async () => {
    await postNode(nodePayload());
    // An unrelated chain between two other organizations.
    await postNode(
      nodePayload({
        usecaseContractId: 'usecase-2',
        dataId: 'other-data',
        participantId: 'http://localhost:4000/',
        participantSourceId: 'http://localhost:4000/',
        dataProviderId: 'http://localhost:4001/',
        dataConsumerId: 'http://localhost:4000/',
        prevDataId: ['trace-node:usecase-2:other-data:http://localhost:4001/'],
      }),
    );
  });

  it('returns only the value chains the organization takes part in', async () => {
    const agent = await login('orga', PASSWORD_A);
    const response = await agent.get('/api/data').expect(200);
    expect(response.body.map((node) => node.dataId).sort()).toEqual(['data123', 'data123']);
  });

  it('matches organizations by any of their registered identifiers', async () => {
    await postNode(
      nodePayload({
        usecaseContractId: 'usecase-3',
        dataId: 'catalog-data',
        participantId: 'http://localhost:4002/',
        participantSourceId: ORG_A_CATALOG,
        dataProviderId: 'http://localhost:4003/',
        dataConsumerId: 'http://localhost:4002/',
        prevDataId: [],
      }),
    );
    const agent = await login('orga', PASSWORD_A);
    const response = await agent.get('/api/data/catalog-data').expect(200);
    expect(response.body.participantSourceId).toBe(ORG_A_CATALOG);
  });

  it('hides nodes of other organizations', async () => {
    const agent = await login('orga', PASSWORD_A);
    await agent.get('/api/data/other-data').expect(404);
    await agent.get('/api/node-tree/other-data').expect(404);
  });

  it('returns the node tree with total incentive', async () => {
    const agent = await login('orga', PASSWORD_A);
    const response = await agent.get(`/api/node-tree/${encodeURIComponent(`trace-node:usecase-1:data123:${ORG_A}`)}`);
    expect(response.status).toBe(200);
    expect(response.body.childNode).toHaveLength(1);
    expect(Number.isFinite(response.body.totalIncentive)).toBe(true);
  });

  it('lets only the owning organization delete a node and unlinks it', async () => {
    const consumerKey = `trace-node:usecase-1:data123:${ORG_B}`;
    const orgA = await login('orga', PASSWORD_A);
    await orgA.delete(`/api/data/${encodeURIComponent(consumerKey)}`).expect(404);

    const orgB = await login('orgb', PASSWORD_B);
    await orgB.delete(`/api/data/${encodeURIComponent(consumerKey)}`).expect(200);

    expect(await Data.countDocuments({ canonicalKey: consumerKey })).toBe(0);
    const provider = await Data.findOne({ canonicalKey: `trace-node:usecase-1:data123:${ORG_A}` });
    expect(provider.childNode).toHaveLength(0);
  });
});

describe('participant names', () => {
  it('names the organizations of the visible graph only', async () => {
    await postNode(nodePayload());
    await postNode(
      nodePayload({
        usecaseContractId: 'usecase-2',
        dataId: 'other-data',
        participantId: 'http://localhost:4000/',
        participantSourceId: 'http://localhost:4000/',
        dataProviderId: ORG_B,
        dataConsumerId: 'http://localhost:4000/',
        prevDataId: [],
      }),
    );

    await request(app).get('/api/participant-names').expect(401);

    const agent = await login('orga', PASSWORD_A);
    const response = await agent.get('/api/participant-names').expect(200);
    expect(response.body).toEqual({ [ORG_A]: 'Organization A', [ORG_B]: 'Organization B' });
  });
});

describe('reported organization names', () => {
  it('uses names reported with the trace for unregistered organizations; the registry wins', async () => {
    await postNode(
      nodePayload({
        participantId: 'http://catalog/participants/unregistered',
        participantSourceId: 'http://catalog/participants/unregistered',
        dataConsumerId: 'http://catalog/participants/unregistered',
        organizationNames: [
          { organizationId: 'http://catalog/participants/unregistered', name: 'Catalog Name' },
          { organizationId: ORG_A, name: 'Catalog name of A' },
        ],
      }),
    );

    const agent = await login('orga', PASSWORD_A);
    const response = await agent.get('/api/participant-names').expect(200);
    expect(response.body['http://catalog/participants/unregistered']).toBe('Catalog Name');
    expect(response.body[ORG_A]).toBe('Organization A');
  });

  it('rejects malformed organization names', async () => {
    const response = await postNode(nodePayload({ organizationNames: [{ organizationId: 1, name: {} }] }));
    expect(response.status).toBe(400);
  });
});

describe('internal endpoints', () => {
  it('requires a filter on the internal data lookup', async () => {
    await request(app).get('/api/internal/data').set('X-DVCT-Internal-Token', INTERNAL_TOKEN).expect(400);
    await request(app).get('/api/internal/data?dataId=data123').expect(401);
  });
});

describe('incentive use case metadata', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/internal/incentive-use-case-metadata')
      .set('X-DVCT-Internal-Token', INTERNAL_TOKEN)
      .send({ useCaseId: 'uc-1', participants: [{ participantId: ORG_A_CATALOG, walletAddress: '0x1' }] })
      .expect(200);
  });

  it('is visible to members only', async () => {
    await request(app).get('/api/incentive-use-case-metadata/uc-1').expect(401);

    const member = await login('orga', PASSWORD_A);
    await member.get('/api/incentive-use-case-metadata/uc-1').expect(200);

    const outsider = await login('orgb', PASSWORD_B);
    await outsider.get('/api/incentive-use-case-metadata/uc-1').expect(404);
    expect(await IncentiveUseCaseMetadata.countDocuments()).toBe(1);
  });
});

describe('CORS', () => {
  it('only reflects allow-listed origins', async () => {
    const allowed = await request(app).get('/').set('Origin', 'http://allowed.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.example');

    const denied = await request(app).get('/').set('Origin', 'http://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
