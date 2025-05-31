const BlockchainService = require('../services/blockchainService');

// Mock ethers
jest.mock('ethers', () => ({
    ethers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
            getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(11155111) }),
            getBlockNumber: jest.fn().mockResolvedValue(1000),
            getCode: jest.fn().mockResolvedValue('0x'),
            getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
            getBlock: jest.fn().mockResolvedValue(null)
        })),
        formatEther: jest.fn().mockReturnValue('1.0')
    }
}));

// Mock database
jest.mock('../src/config/database', () => ({
    connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
    }),
    query: jest.fn().mockResolvedValue({ rows: [] })
}));

describe('BlockchainService', () => {
    let blockchainService;

    beforeEach(() => {
        // Set required environment variable
        process.env.ETHEREUM_RPC_URL = 'https://sepolia.infura.io/v3/test';
        blockchainService = new BlockchainService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAddressType', () => {
        it('should return EOA for address with no code', async () => {
            const result = await blockchainService.getAddressType('0x742929C426AA1Bc6a5eb4298C3C25D3C1D7A2E8a');
            expect(result).toBe('EOA');
        });

        it('should return CONTRACT for address with code', async () => {
            const mockProvider = await blockchainService.getProvider();
            mockProvider.getCode.mockResolvedValueOnce('0x608060405234801561001057600080fd5b50');

            const result = await blockchainService.getAddressType('0x742929C426AA1Bc6a5eb4298C3C25D3C1D7A2E8a');
            expect(result).toBe('CONTRACT');
        });
    });

    describe('determineStartBlock', () => {
        it('should return provided fromBlock when specified', async () => {
            const result = await blockchainService.determineStartBlock('0x742929C426AA1Bc6a5eb4298C3C25D3C1D7A2E8a', 100);
            expect(result).toBe(100);
        });

        it('should return 0 for EOA when fromBlock not specified', async () => {
            const result = await blockchainService.determineStartBlock('0x742929C426AA1Bc6a5eb4298C3C25D3C1D7A2E8a');
            expect(result).toBe(0);
        });
    });

    describe('getBalance', () => {
        it('should return balance data for address', async () => {
            const result = await blockchainService.getBalance('0x742929C426AA1Bc6a5eb4298C3C25D3C1D7A2E8a');

            expect(result).toHaveProperty('balance');
            expect(result).toHaveProperty('blockNumber');
            expect(result).toHaveProperty('formattedBalance');
            expect(result.balance).toBe('1000000000000000000');
            expect(result.blockNumber).toBe(1000);
        });
    });
});