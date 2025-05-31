const BlockchainService = require('../services/blockchainService');
const pool = require('../config/database');

class TransactionController {
    constructor() {
        this.blockchainService = new BlockchainService();
    }

    async fetchAndStoreTransactions(req, res) {
        try {
            const { address } = req.params;
            const { fromBlock, toBlock } = req.query;

            // Validate address
            if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({
                    error: 'Invalid Ethereum address format'
                });
            }

            console.log(`Processing transactions for address: ${address}`);

            const transactions = await this.blockchainService.fetchTransactions(
                address,
                fromBlock,
                toBlock
            );

            const storedCount = await this.blockchainService.storeTransactions(transactions);

            res.json({
                success: true,
                address,
                transactionsFetched: transactions.length,
                transactionsStored: storedCount,
                fromBlock: fromBlock || 'determined automatically',
                toBlock: toBlock || 'latest'
            });

        } catch (error) {
            console.error('Error in fetchAndStoreTransactions:', error);
            res.status(500).json({
                error: 'Failed to fetch and store transactions',
                details: error.message
            });
        }
    }

    async getTransactions(req, res) {
        try {
            const { address } = req.params;
            const { page = 1, limit = 50 } = req.query;

            const offset = (page - 1) * limit;

            const result = await pool.query(`
        SELECT * FROM transactions 
        WHERE from_address = $1 OR to_address = $1
        ORDER BY block_number DESC, transaction_index DESC
        LIMIT $2 OFFSET $3
      `, [address, limit, offset]);

            const countResult = await pool.query(`
        SELECT COUNT(*) FROM transactions 
        WHERE from_address = $1 OR to_address = $1
      `, [address]);

            res.json({
                success: true,
                address,
                transactions: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].count),
                    pages: Math.ceil(countResult.rows[0].count / limit)
                }
            });

        } catch (error) {
            console.error('Error in getTransactions:', error);
            res.status(500).json({
                error: 'Failed to retrieve transactions',
                details: error.message
            });
        }
    }

    async fetchAndStoreBalance(req, res) {
        try {
            const { address } = req.params;

            // Validate address
            if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({
                    error: 'Invalid Ethereum address format'
                });
            }

            const balanceData = await this.blockchainService.getBalance(address);

            await this.blockchainService.storeBalance(
                address,
                balanceData.balance,
                balanceData.blockNumber
            );

            res.json({
                success: true,
                address,
                balance: balanceData.balance,
                formattedBalance: balanceData.formattedBalance,
                blockNumber: balanceData.blockNumber
            });

        } catch (error) {
            console.error('Error in fetchAndStoreBalance:', error);
            res.status(500).json({
                error: 'Failed to fetch and store balance',
                details: error.message
            });
        }
    }

    async getBalance(req, res) {
        try {
            const { address } = req.params;

            const result = await pool.query(`
        SELECT * FROM address_balances 
        WHERE address = $1
      `, [address]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'Balance not found for this address. Fetch it first using POST endpoint.'
                });
            }

            const balance = result.rows[0];
            res.json({
                success: true,
                address,
                balance: balance.balance,
                formattedBalance: require('ethers').formatEther(balance.balance),
                blockNumber: balance.block_number,
                lastUpdated: balance.last_updated
            });

        } catch (error) {
            console.error('Error in getBalance:', error);
            res.status(500).json({
                error: 'Failed to retrieve balance',
                details: error.message
            });
        }
    }
}

module.exports = TransactionController;