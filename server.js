const app = require("./app");
const { connectMongoDB } = require("./config/mongoDatabase");
const { initBlockchainTables } = require("./config/postgreDatabase"); // New blockchain DB init
const {
  initializeBlockchainConnection,
} = require("./config/initBlockchainConnection");
const config = require("./config/environment");
const TRANSFER_EVENT_ABI = [
    {
        "type": "event",
        "name": "Transfer",
        "inputs": [
            {"name": "src", "type": "address", "internalType": "address", "indexed": true}, // Added "internalType"
            {"name": "dst", "type": "address", "internalType": "address", "indexed": true}, // Added "internalType"
            {"name": "wad", "type": "uint256", "internalType": "uint256", "indexed": false} // Added "internalType"
        ],
        "anonymous": false // Added "anonymous" property
    }
];

const CONTRACT_ADDRESS = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';
const startServer = async () => {
  await connectMongoDB(); // Connect to MongoDB

  // Initialize both databases
  Promise.all([
    initBlockchainTables(),
    initializeBlockchainConnection(CONTRACT_ADDRESS, TRANSFER_EVENT_ABI),
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
