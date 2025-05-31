const { pool } = require('../postgreDatabase');

async function saveTransactionToDB(address, balance) {
    try {
        const query = `
      INSERT INTO wallet_balances (address, balance)
      VALUES ($1, $2)
      RETURNING *;
    `;

        const values = [address, balance];

        const result = await pool.query(query, values);
        console.log('Saved to DB:', result.rows[0]);
    } catch (err) {
        console.error('Error saving to DB:', err);
    }
}

module.exports = saveTransactionToDB;