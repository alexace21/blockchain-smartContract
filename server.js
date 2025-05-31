const app = require("./app");
const { connectDB } = require("./config/database");
const { initBlockchainTables } = require("./config/blockchainDatabase"); // New blockchain DB init
const {
  initializeBlockchainConnection,
} = require("./config/initBlockchainConnection");
const config = require("./config/environment");

const startServer = async () => {
  await connectDB(); // Connect to MongoDB

  // Initialize both databases
  Promise.all([
    initBlockchainTables(),
    initializeBlockchainConnection,
  ])
    .then(() => {
      app.listen(config.PORT, () => {
        console.log(`Application is running on port ${config.PORT}...`);
        console.log("Both MongoDB and PostgreSQL connections established");
      });
    })
    .catch((error) => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION! 💥 Shutting down...");
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
    console.error(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();
