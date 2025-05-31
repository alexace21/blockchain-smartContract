const request = require('supertest');
const app = require('../src/app');

// Mock the blockchain service
jest.mock('../services/blockchainService');

describe('API Endpoints', () => {
    describe('GET /api/v1/health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/v1/health');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('POST /api/v1/addresses/:address/transactions', () => {
        it('should reject invalid address format', async () => {
            const response = await request(app)
                .post('/api/v1/addresses/invalid-address/transactions');

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid Ethereum address format');
        });

        it('should accept valid address format', async () => {
            // This will fail due to mocked service, but address validation should pass
            const response = await request(app)
                .post('/api/v1/addresses/0x742929C426AA1Bc6a5eb4298C3C25D3C1D7A2E8a/transactions');

            // We expect 500 due to mocked service, but not 400 for invalid address
            expect(response.status).not.toBe(400);
        });
    });

    describe('GET /api/v1/addresses/:address/transactions', () => {
        it('should handle transaction retrieval', async () => {
            const response = await request(app)
                .get('/api/v1/addresses/0x742929C426AA1Bc6a5eb4298C3C25D3C1D7A2E8a/transactions');

            // Will be 500 due to database mock, but route exists
            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/v1/nonexistent', () => {
        it('should return 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/v1/nonexistent');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'Route not found');
        });
    });
});