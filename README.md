# Blockchain Explorer & User Management API

A robust Node.js backend API designed for user management, authentication, and interaction with blockchain data. This project features secure authentication with JWT and refresh tokens, comprehensive user profile management, and a module to fetch and index blockchain transactional and balance data.

## Features

*   **User Authentication:**
    *   User Registration, Login, and Logout.
    *   JWT-based Access Tokens for secure API access.
    *   Refresh Tokens for seamless token renewal.
    *   Secure password hashing using `bcryptjs`.
*   **User Management:**
    *   Retrieve authenticated user's profile (`/me`).
    *   Update user profile (username, email).
    *   Change user password securely.
*   **Blockchain Integration:**
    *   Fetch transactions for a given Ethereum address.
    *   Fetch current balance for a given Ethereum address.
    *   Blockchain Indexer to continuously process and store blockchain data (e.g., blocks, transactions, states).
*   **Data Validation:** Comprehensive input validation using `Joi` schemas.
*   **Centralized Error Handling:** Consistent error responses across the API.
*   **Structured Logging:** Utilizes `Winston` for application logging.
*   **Dual Database Support:** Interacts with both MongoDB (for user/token data) and PostgreSQL (potentially for indexed blockchain data or other relational data).

## Technologies Used

*   **Backend:** Node.js, Express.js
*   **Databases:**
    *   MongoDB (with Mongoose ORM)
    *   PostgreSQL (with `pg` driver)
*   **Authentication & Security:**
    *   JSON Web Tokens (JWT)
    *   Bcryptjs (Password Hashing)
    *   Helmet (Security Headers)
    *   CORS (Cross-Origin Resource Sharing)
*   **Blockchain:**
    *   Ethers.js (Ethereum interaction)
*   **Validation:** Joi
*   **Logging:** Winston, Winston Daily Rotate File
*   **Environment Management:** Dotenv
*   **Development & Testing:**
    *   Jest (Unit Testing Framework)

## Project Structure

The project follows a modular and layered architecture:
├── config/ # Environment variables, database connections
├── controllers/ # Handles incoming requests, orchestrates service calls
├── middlewares/ # Express middleware (auth, error handling, validation)
├── models/ # Mongoose schemas for MongoDB data
├── api/ # Express routes definitions
├── services/ # Core business logic and database interactions
├── utils/ # Utility functions (AppError, JWT, password hashing, Joi validation)
├── tests/ # Unit tests for various modules
└── package.json
└── README.md
└── .env.example



## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or Yarn (package manager)
*   MongoDB instance (local or cloud)
*   PostgreSQL instance (local or cloud)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd your-project-name
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Environment Variables:**
    Create a `.env` file in the root of your project based on `.env.example`.
    ```env
    # .env example
    PORT=3005 || 3000

    # MongoDB
    MONGO_URI=mongodb://localhost:27017/your_db_name

    # PostgreSQL
    PG_USER=your_pg_user
    PG_HOST=localhost
    PG_DATABASE=your_pg_db
    PG_PASSWORD=your_pg_password
    PG_PORT=5432

    # JWT Secrets (Use strong, random values for production!)
    JWT_ACCESS_SECRET=your_jwt_access_secret_key
    JWT_ACCESS_EXPIRATION=1h
    JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
    JWT_REFRESH_EXPIRATION=7d

    # Other configurations as needed
    # ...
    ```
    Ensure you fill in your actual database credentials and strong secret keys.

### Running the Application

To start the development server:
```bash
npm start
# or
node server.js # (assuming your main entry file is index.js)

Running Tests
This project uses Jest for unit testing.

Run all tests:
npm test


Run tests in watch mode (reruns on file changes):
npm run test:watch

Generate code coverage report:
npm run test:coverage

API Endpoints:
This is a partial list of exposed API endpoints. Refer to the api.js file for full definitions.

Environment: 
GET /api/health: Get health information about Project whether running or not.

Authentication (/api/auth)
POST /api/auth/register: Register a new user.
POST /api/auth/login: Authenticate a user and receive tokens.
POST /api/auth/refresh: Refresh access token using a refresh token.
POST /api/auth/logout: Invalidate refresh token(s).

User Management (/api/users)
GET /api/users/me: Get authenticated user's profile. (Requires access token)
PUT /api/users/me: Update authenticated user's profile (username, email). (Requires access token)
PUT /api/users/me/password: Change authenticated user's password. (Requires access token)

Blockchain (/api/blockchain)
GET /api/eth/indexer/status: Get Indexer status and additional actual information.
GET /api/eth/address/:addressId/transactions: Fetch blockchain transactions for a specific address. (Requires access token)
GET /api/eth/address/:addressId/balance: Fetch current Ethereum balance for a specific address. (Requires access token)
GET /api/eth/contracts/:addressId/events: Fetch all stored events from Database. (Requires access token)
DELETE /api/eth/contracts/:addressId/watch: Updates MongoDB model IndexerState's state and stops indexing smart contract. (Requires access token)
POST /api/eth/contracts/:addressId/watch: Updates MongoDB model IndexerState's state and starts indexing smart contract + store events. (Requires access token)
Example body:
{
      "eventSignature": "Transfer(address,address,uint256)"
  //"fromBlock": 21499999  // optional
}