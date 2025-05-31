const { Pool } = require('pg');
const { POSTGRES_CONFIG } = require('./environment');

const pool = new Pool(POSTGRES_CONFIG);

// Test connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database for blockchain data');
});

pool.on('error', (err) => {
    console.error('PostgreSQL connection error:', err);
});

// Create tables if they don't exist
const initBlockchainTables = async () => {
    try {
        // Create transactions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(24),
                hash VARCHAR(66) UNIQUE NOT NULL,
                from_address VARCHAR(42) NOT NULL,
                to_address VARCHAR(42),
                value VARCHAR(50) NOT NULL,
                gas_used VARCHAR(20),
                gas_price VARCHAR(50),
                block_number BIGINT NOT NULL,
                block_hash VARCHAR(66) NOT NULL,
                transaction_index INTEGER NOT NULL,
                nonce INTEGER NOT NULL,
                input TEXT,
                status INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create address_balances table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS address_balances (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(24),
                address VARCHAR(42) NOT NULL,
                balance VARCHAR(50) NOT NULL,
                block_number BIGINT NOT NULL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, address)
            );
        `);

        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
            CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);
            CREATE INDEX IF NOT EXISTS idx_transactions_block_number ON transactions(block_number);
            CREATE INDEX IF NOT EXISTS idx_address_balances_user_id ON address_balances(user_id);
            CREATE INDEX IF NOT EXISTS idx_address_balances_address ON address_balances(address);
        `);

        console.log('Blockchain database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing blockchain tables:', error);
    }
};

module.exports = { pool, initBlockchainTables };