const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Your Express app
const Data = require('../models/data'); // Data model

// Helper function to clear the database before each test
const clearDatabase = async () => {
  await Data.deleteMany({});
};

beforeEach(async () => {
  await clearDatabase();
});

// POST /api/node - Test the creation of a new node
describe('POST /api/node', () => {
  it('should create a new node', async () => {
    const inputData = {
      dvctId: "dvct123",
      usecaseContractId: "contract123",
      usecaseContractTitle: "Test Contract",
      contractId: "contract123",
      dataId: "data123",
      dataProviderId: "provider123",
      dataConsumerId: "consumer123",
      dataConsumerIsAIProvider: false,
      prevDataId: [],
      incentiveForDataProvider: {
        numPoints: 10,
        factor: 1.5,
        factorCheck: true
      }
    };

    const response = await request(app)
      .post('/api/node')
      .send(inputData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'Data saved successfully');
    expect(response.body.data).toHaveProperty('nodeId');
    expect(response.body.data).toHaveProperty('dataId', inputData.dataId);
  });

  it('should return 500 if there is an error in generating the JSON-LD data', async () => {
    const response = await request(app)
      .post('/api/node')
      .send({});
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

// GET /api/data/:nodeId - Test retrieving node data by nodeId
describe('GET /api/data/:nodeId', () => {
  it('should retrieve JSON-LD data for an existing node', async () => {
    const data = new Data({
      nodeId: "node123",
      dataId: "data123",
      nodeMetadata: {
        dvctId: "dvct123",
        usecaseContractId: "contract123",
        dataProviderId: "provider123",
        dataConsumerId: "consumer123",
        incentiveReceivedFrom: []
      },
      prevNode: [],
      childNode: []
    });

    await data.save();

    const response = await request(app).get(`/api/data/${data.nodeId}`);
    expect(response.status).toBe(200);
    expect(response.body.nodeId).toBe(data.nodeId);
  });

  it('should return 404 for a non-existent node', async () => {
    const response = await request(app).get('/api/data/nonexistentNodeId');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Node not found');
  });
});

// DELETE /api/data/:nodeId - Test deleting a node
describe('DELETE /api/data/:nodeId', () => {
  it('should delete the node and return success', async () => {
    const data = new Data({
      nodeId: "node123",
      dataId: "data123",
      nodeMetadata: {
        dvctId: "dvct123",
        usecaseContractId: "contract123",
        dataProviderId: "provider123",
        dataConsumerId: "consumer123",
        incentiveReceivedFrom: []
      },
      prevNode: [],
      childNode: []
    });

    await data.save();

    const response = await request(app).delete(`/api/data/${data.nodeId}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Node deleted successfully');
  });

  it('should return 404 for a non-existent node', async () => {
    const response = await request(app).delete('/api/data/nonexistentNodeId');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Node not found');
  });
});

// GET /api/data - Test retrieving all data
describe('GET /api/data', () => {
  it('should retrieve all JSON-LD data', async () => {
    const data = new Data({
      nodeId: "node123",
      dataId: "data123",
      nodeMetadata: {
        dvctId: "dvct123",
        usecaseContractId: "contract123",
        dataProviderId: "provider123",
        dataConsumerId: "consumer123",
        incentiveReceivedFrom: []
      },
      prevNode: [],
      childNode: []
    });

    await data.save();

    const response = await request(app).get('/api/data');
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('should return 500 if there is an error', async () => {
    // Simulate a server error by forcing an invalid operation
    jest.spyOn(Data, 'find').mockImplementationOnce(() => { throw new Error('Server error'); });

    const response = await request(app).get('/api/data');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

// GET /api/node-tree/:nodeId - Test retrieving node tree
describe('GET /api/node-tree/:nodeId', () => {
  it('should retrieve the node tree with total incentive', async () => {
    const data = new Data({
      nodeId: "node123",
      dataId: "data123",
      nodeMetadata: {
        dvctId: "dvct123",
        usecaseContractId: "contract123",
        dataProviderId: "provider123",
        dataConsumerId: "consumer123",
        incentiveReceivedFrom: [{ organizationId: "org123", numPoints: 10, contractId: "contract123" }]
      },
      prevNode: [],
      childNode: [{ nodeId: "childNode123", "@nodeUrl": "https://url-to-childNode/childNode123" }]
    });

    await data.save();

    const response = await request(app).get(`/api/node-tree/${data.nodeId}`);
    expect(response.status).toBe(200);
    expect(response.body.nodeId).toBe(data.nodeId);
    expect(response.body.totalIncentive).toBeGreaterThan(0);
  });

  it('should return 404 for a non-existent node', async () => {
    const response = await request(app).get('/api/node-tree/nonexistentNodeId');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Node not found');
  });
});
