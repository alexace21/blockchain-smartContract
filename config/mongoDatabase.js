const mongoose = require('mongoose');
const config = require('./environment');

const connectMongoDB = async (uri = config.mongoUri) => { // Renamed function
  try {
    mongoose.set('strictQuery', true); // Suppress deprecation warning and set explicit behavior
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

const disconnectMongoDB = async () => { // Renamed function
  try {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected...');
  } catch (err) {
    console.error(`MongoDB disconnection error: ${err.message}`);
  }
};

module.exports = { connectMongoDB, disconnectMongoDB };
