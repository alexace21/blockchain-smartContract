const jwt = require('jsonwebtoken');
const { promisify } = require('util');

exports.verify = promisify(jwt.verify); // turn the function into Promise
exports.sign = promisify(jwt.sign);