const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'JSON-LD API',
      version: '1.0.0',
      description: 'API for managing JSON-LD data',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      schemas: {
        InputData: {
          type: 'object',
          properties: {
            dvctId: { type: 'string' },
            usecaseContractId: { type: 'string' },
            usecaseContractTitle: { type: 'string' },
            extraIncentiveForAIProvider: {
              type: 'object',
              properties: {
                numPoints: { type: 'integer' },
                factor: { type: 'number' },
                factorCheck: { type: 'boolean' }
              }
            },
            contractId: { type: 'string' },
            dataId: { type: 'string' },
            dataProviderId: { type: 'string' },
            dataConsumerId: { type: 'string' },
            dataConsumerIsAIProvider: { type: 'boolean' },
            prevDataId: { type: 'string' },
            incentiveForDataProvider: {
              type: 'object',
              properties: {
                numPoints: { type: 'integer' },
                factor: { type: 'number' },
                factorCheck: { type: 'boolean' }
              }
            }
          }
        },
        JsonLdData: {
          type: 'object',
          properties: {
            "@context": { type: 'object' },
            "@type": { type: 'string' },
            nodeId: { type: 'string' },
            dataId: { type: 'string' },
            nodeMetadata: {
              type: 'object',
              properties: {
                dvctId: { type: 'string' },
                usecaseContractId: { type: 'string' },
                dataProviderId: { type: 'string' },
                dataConsumerId: { type: 'string' },
                incentiveReceivedFrom: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      organizationId: { type: 'string' },
                      numPoints: { type: 'integer' },
                      contractId: { type: 'string' }
                    }
                  }
                }
              }
            },
            prevNode: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nodeId: { type: 'string' },
                  "@nodeUrl": { type: 'string' }
                }
              }
            },
            childNode: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nodeId: { type: 'string' },
                  "@nodeUrl": { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/dataRoutes.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

module.exports = swaggerDocs;
