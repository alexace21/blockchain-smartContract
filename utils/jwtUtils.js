const jwt = require('jsonwebtoken');
const config = require('../config/environment');

const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null; // Token is invalid or expired
  }
};

const generateAuthTokens = (userId) => {
  const accessToken = generateToken(
    { id: userId },
    config.jwt.secret,
    config.jwt.accessExpiration
  );
  const refreshToken = generateToken(
    { id: userId },
    config.jwt.refreshSecret,
    config.jwt.refreshExpiration
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: jwt.decode(accessToken).exp - Math.floor(Date.now() / 1000), // Remaining seconds
  };
};

module.exports = {
  generateToken,
  verifyToken,
  generateAuthTokens,
};