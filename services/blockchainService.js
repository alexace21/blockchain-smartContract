const checkForDuplicate = require("../config/databaseOperations/transactionExistsInDB")
const findByHash = require("../config/databaseOperations/findTransactionByHash")
const { getProvider } = require("../config/initBlockchainConnection");

const { ethers } = require('ethers');
const {pool} = require("../config/postgreDatabase");
const { log } = require("winston");

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/6b15138c2072481f941b38b7cc96208f`);
        this.DEFAULT_TRANSACTIONS_LIMIT = 5; // You want to store 5-10
    }

    async getProvider() {
        console.log(this.provider)
        try {
            return this.provider;
        } catch (error) {
            console.error('Provider connection error:', error);
            throw new Error('Failed to connect to Ethereum network');
        }
    }

    async getNativeBalance(address) {
        const balanceWei = await this.provider.getBalance(address);
        const balanceEth = ethers.formatEther(balanceWei);

        console.log(`Balance of ${address}: ${balanceEth} ETH`);
        return balanceEth;
    }




    async getAddressType(address) {
        const provider = await this.getProvider();
        const code = await provider.getCode(address);
        return code === '0x' ? 'EOA' : 'CONTRACT';
    }

    async getContractCreationBlock(address) {
        const provider = await this.getProvider();
        const currentBlock = await provider.getBlockNumber();
        
        let low = 0;
        let high = currentBlock;
        let creationBlock = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            try {
                const code = await provider.getCode(address, mid);
                if (code === '0x') {
                    low = mid + 1;
                } else {
                    creationBlock = mid;
                    high = mid - 1;
                }
            } catch (error) {
                high = mid - 1;
            }
        }

        return creationBlock;
    }

    async determineStartBlock(address, fromBlock) {
        if (fromBlock !== undefined) {
            return parseInt(fromBlock);
        }

        const addressType = await this.getAddressType(address);
        
        if (addressType === 'EOA') {
            return 0;
        } else {
            return await this.getContractCreationBlock(address);
        }
    }

    async fetchBlocksInBatches(provider, start, end, address) {
        let storedTransactions = [];

        for (let i = start; i <= end; i++) {

            if (storedTransactions.length >= this.DEFAULT_TRANSACTIONS_LIMIT) {
                break; // We have collected enough new transactions
            }
            const blockHex = "0x" + i.toString(16);

            try {
                const block = await provider.send("eth_getBlockByNumber", [blockHex, true]);
                console.log(`Fetched block: ${i}`);

                if (block && block.transactions) {
                    for (const tx of block.transactions) {
                        if (tx.from && (tx.from.toLowerCase() === address.toLowerCase() ||
                            (tx.to && tx.to.toLowerCase() === address.toLowerCase()))) {
                            if (storedTransactions.length >= this.DEFAULT_TRANSACTIONS_LIMIT) {
                                break ; // We have collected enough new transactions
                            }

                            // Check if this transaction already exists in our database
                            const existsInDb = await checkForDuplicate(tx.hash);

                            if (existsInDb) {
                                console.log(`Transaction ${tx.hash} already exists in DB. Skipping processing.`);
                                continue; // Skip if already known
                            }

                            await this.storeTransaction(tx)

                            storedTransactions.push(await findByHash(tx.hash));
                    }
                }
                }
            } catch (err) {
                console.warn(`Error fetching block ${i}:`, err.message);
            }
            if (storedTransactions.length >= this.DEFAULT_TRANSACTIONS_LIMIT) {
                break ; // We have collected enough new transactions
            }
            await new Promise((r) => setTimeout(r, 300)); // throttle: 1 request every 300ms
        }
        return storedTransactions;
    }

    async fetchTransactions(address, fromBlock, toBlock, userId = null) {
        const provider = await this.getProvider();
        
        const startBlock = await this.determineStartBlock(address, fromBlock);
        const endBlock = toBlock ? parseInt(toBlock) : await provider.getBlockNumber();

        console.log(`Fetching transactions for ${address} from block ${startBlock} to ${endBlock}`);

        let transactions = [];
        const batchSize = 16; // Smaller batch size for better performance

        for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += batchSize) {
            const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);
            
            try {
                transactions = await this.fetchBlocksInBatches(provider, currentBlock, batchEnd, address)
            } catch (error) {
                console.error(`Error fetching transactions for blocks ${currentBlock}-${batchEnd}:`, error);
            }

            if (transactions.length > 0) {
                return transactions;
            }
        }

        return transactions;
    }

    async storeTransaction(transaction) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

                await client.query(`
                    INSERT INTO transactions 
                    (user_id, hash, from_address, to_address, value, gas_used, gas_price, block_number, 
                     block_hash, transaction_index, nonce, input, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (hash) DO UPDATE SET
                        gas_used = EXCLUDED.gas_used,
                        status = EXCLUDED.status,
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    transaction.userId, transaction.hash, transaction.from, transaction.to, transaction.value, transaction.gasUsed, transaction.gasPrice,
                    transaction.blockNumber, transaction.blockHash, transaction.transactionIndex, transaction.nonce,
                    transaction.input, transaction.status
                ]);


            await client.query('COMMIT');
            console.log("Saved transaction: " + transaction.toLocaleString())
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getBalance(address) {
        const provider = await this.getProvider();
        const balance = await provider.getBalance(address);
        const blockNumber = await provider.getBlockNumber();
        
        return {
            balance: balance.toString(),
            blockNumber,
            formattedBalance: ethers.formatEther(balance)
        };
    }

    async storeBalance(address, balance, blockNumber, userId = null) {
        await pool.query(`
            INSERT INTO address_balances (user_id, address, balance, block_number)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, address) DO UPDATE SET
                balance = EXCLUDED.balance,
                block_number = EXCLUDED.block_number,
                last_updated = CURRENT_TIMESTAMP
        `, [userId, address, balance, blockNumber]);
    }

    async getUserTransactions(userId, page = 1, limit = 50) {
        const offset = (page - 1) * limit;

        const result = await pool.query(`
            SELECT * FROM transactions 
            WHERE user_id = $1
            ORDER BY block_number DESC, transaction_index DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        const countResult = await pool.query(`
            SELECT COUNT(*) FROM transactions 
            WHERE user_id = $1
        `, [userId]);

        return {
            transactions: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        };
    }

    async getUserBalances(userId) {
        const result = await pool.query(`
            SELECT * FROM address_balances 
            WHERE user_id = $1
            ORDER BY last_updated DESC
        `, [userId]);

        return result.rows.map(balance => ({
            ...balance,
            formattedBalance: ethers.formatEther(balance.balance)
        }));
    }
}

module.exports = BlockchainService;