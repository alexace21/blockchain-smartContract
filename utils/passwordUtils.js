const bcrypt = require('bcryptjs');

const saltRounds = 10;

const hashPassword = async (password) => {
  if (!password) {
    throw new Error('Password is required for hashing');
  }
  return bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
    if (!password || !hashedPassword) { // This is where the error *should* be thrown
    throw new Error('Both passwords are required for comparison');
  }
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};