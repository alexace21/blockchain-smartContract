exports.ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3005,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/limeChainAssessment',
  postgres: { // New PostgreSQL config object
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432, // Parse port as integer
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '1h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
};