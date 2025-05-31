exports.PORT = 3005;
exports.DB_STRING = 'mongodb://127.0.0.1:27017/limeChainAssessment'; // VARIABLE: localhost/127.0.0.1 
exports.SALT_ROUNDS = 10;
exports.SECRET = 'LEEEEEEEEEEEROOOOOOOOOOOOYYYYYYYYYYJEENKINSSSSSSSSSSSSSSSSSSS';
exports.ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3005,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/limeChainAssessment',
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '1h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
};
exports.POSTGRES_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'blockchain_data',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || "123456789",
};