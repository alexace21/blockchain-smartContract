const {pool} = require('../postgreDatabase')

/**
 * @param {string} txHash The transaction hash to check.
 */
async function findTransactionByHash(txHash) {
    const result = await pool.query(`
            SELECT * FROM transactions WHERE hash = $1
        `, [txHash]);
    return result.rows[0];
}
module.exports = findTransactionByHash;