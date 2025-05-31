const mongoose = require('mongoose');
const config = require('./environment');

const connectDB = async (uri = config.mongoUri) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected...');
  } catch (err) {
    console.error(`MongoDB disconnection error: ${err.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
