const pool = require('../config/blockchainDatabase');
// const config = require('../config');
class Event {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                contract_address VARCHAR(42) NOT NULL,
                event_name VARCHAR(100) NOT NULL,
                block_number BIGINT NOT NULL,
                transaction_hash VARCHAR(66) NOT NULL,
                log_index INT NOT NULL,
                block_hash VARCHAR(66) NOT NULL,
                timestamp BIGINT NOT NULL,
                sender_address VARCHAR(42),
                recipient_address VARCHAR(42),
                value NUMERIC(78, 0),
                raw_args_json JSONB,
                indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_event_log UNIQUE (transaction_hash, log_index)
            );
            CREATE INDEX IF NOT EXISTS idx_events_contract_address ON events (contract_address);
            CREATE INDEX IF NOT EXISTS idx_events_block_number ON events (block_number);
            CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp);
            CREATE INDEX IF NOT EXISTS idx_events_sender_address ON events (sender_address);
            CREATE INDEX IF NOT EXISTS idx_events_recipient_address ON events (recipient_address);
            CREATE INDEX IF NOT EXISTS idx_events_event_name ON events (event_name);
        `;
        await pool.query(query);
    }

    static async upsert(eventData, options) {
        const { conflictFields, updateOnDuplicate } = options;
        const columns = Object.keys(eventData);
        const values = Object.values(eventData);

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.join(', ');

        let query = `
            INSERT INTO events (${columnNames})
            VALUES (${placeholders})
        `;

        if (conflictFields && conflictFields.length > 0) {
            query += ` ON CONFLICT (${conflictFields.join(', ')}) DO UPDATE SET `;
            query += updateOnDuplicate.map(field => `${field} = EXCLUDED.${field}`).join(', ');
        } else {
            // If no conflict fields, just do nothing on conflict (though unique_event_log handles it)
            query += ` ON CONFLICT DO NOTHING`;
        }
        
        await pool.query(query, values);
    }

    // Add other query methods here (get, find, aggregate)
    static async find(filters = {}, { limit = 10, offset = 0, sortBy = 'block_number', sortOrder = 'DESC' } = {}) {
        let query = `SELECT * FROM events`;
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (filters.contractAddress) {
            conditions.push(`contract_address = $${paramIndex++}`);
            params.push(filters.contractAddress);
        }
        if (filters.fromBlock) {
            conditions.push(`block_number >= $${paramIndex++}`);
            params.push(filters.fromBlock);
        }
        if (filters.toBlock) {
            conditions.push(`block_number <= $${paramIndex++}`);
            params.push(filters.toBlock);
        }
        if (filters.eventName) {
            conditions.push(`event_name = $${paramIndex++}`);
            params.push(filters.eventName);
        }
        if (filters.sender) {
            conditions.push(`sender_address = $${paramIndex++}`);
            params.push(filters.sender);
        }
        if (filters.recipient) {
            conditions.push(`recipient_address = $${paramIndex++}`);
            params.push(filters.recipient);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const { rows } = await pool.query(query, params);
        return rows;
    }

    static async aggregateVolume(contractAddress, interval = 'daily', fromTimestamp, toTimestamp) {
        let groupByClause;
        switch (interval) {
            case 'hourly':
                groupByClause = 'DATE_TRUNC(\'hour\', TO_TIMESTAMP(timestamp))';
                break;
            case 'daily':
                groupByClause = 'DATE_TRUNC(\'day\', TO_TIMESTAMP(timestamp))';
                break;
            case 'monthly':
                groupByClause = 'DATE_TRUNC(\'month\', TO_TIMESTAMP(timestamp))';
                break;
            default:
                throw new Error('Invalid interval. Supported: hourly, daily, monthly.');
        }

        const params = [contractAddress];
        let paramIndex = 2;

        let whereClause = 'WHERE contract_address = $1';
        if (fromTimestamp) {
            whereClause += ` AND timestamp >= $${paramIndex++}`;
            params.push(fromTimestamp);
        }
        if (toTimestamp) {
            whereClause += ` AND timestamp <= $${paramIndex++}`;
            params.push(toTimestamp);
        }

        const query = `
            SELECT
                ${groupByClause} AS interval_start,
                COUNT(*) AS total_events,
                SUM(value) AS total_value_wei -- Assuming value is in wei
            FROM events
            ${whereClause}
            GROUP BY interval_start
            ORDER BY interval_start ASC;
        `;

        const { rows } = await pool.query(query, params);
        return rows;
    }
}

module.exports = { Event };