const {pool} = require('../postgreDatabase')

/**
 * Checks if a transaction hash already exists in the database.
 * This is a direct database query, outside of the BlockchainService.
 * @param {string} txHash The transaction hash to check.
 * @returns {Promise<boolean>} True if the transaction exists, false otherwise.
 */
async function transactionExistsInDb(txHash) {
    const result = await pool.query(`
            SELECT COUNT(*) FROM transactions WHERE hash = $1
        `, [txHash]);
    return parseInt(result.rows[0].count) > 0;
}
module.exports = transactionExistsInDb;