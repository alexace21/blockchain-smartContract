# AI BE Task for Junior, Mid, and Senior

## Before you begin

### Guide to Using AI for Assistance

In this assessment, you're encouraged to utilize ChatGPT, GitHub Copilot, and other AI tools to help you complete the task. Whether it's architecting solutions, solving coding challenges, or understanding new concepts, AI can be a powerful tool. We're interested not just in the end result but also in how you use AI to tackle challenges, so please don't forget to submit your full prompt as well!

### Submission Requirements:

#### Your Repository: The repository should include:

- Production-Ready Code: Make sure the project is fully functional and optimized for production use.
- README File: Provide a README file that explains your work, how to install and run the project, any architecture decisions you made, and how to run it.
- Docker Configuration: Include all necessary Docker files and docker-compose configurations.
- API Documentation: Comprehensive API documentation using OpenAPI/Swagger.
- Best Practices: Structure the repository with appropriate folder organization, linting configurations, and any other best practices for a professional project.

### Full AI Prompt Export:

Please attach the full AI prompts in a single text file (ai_prompts.txt) or Markdown file (ai_prompts.md).

#### Note: We encourage you to approach this as you would a real-world project task.

## Let's go:

### Building a Scalable Backend Service with Blockchain Integration

### Core Task (Junior Level): Build Authentication and User Management System

**Objective**: Create a containerized backend service handling user authentication and basic CRUD operations.

**Features**:

- User registration and authentication using JWT
- Password hashing and security best practices
- Basic user profile management
- Input validation and error handling

**Technical Requirements**:

- Use Node.js/Express.js or similar framework
- PostgreSQL or MongoDB for data storage
- Docker and docker-compose setup
- Basic unit tests
- Environment configuration management

**Assessment Focus**:

- API design
- Security implementation
- Docker configuration
- Database schema design
- Error handling patterns

### Additional Task for Mid-Level: Transaction Data Processing

**Objective**: Add a single chain (Ethereum Sepolia) transaction processing system.

**Features**:

- Fetch and store transactions for a given address by providing block from/block to as optional query string params
  - [0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9](https://sepolia.etherscan.io/address/0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9) - address for transaction retrieval
  - if block from is not specified take the creation block of the contract or block 0 if EOA
  - if block to is not specified take latest block
- Fetch and store native currency balance of an address
- REST API endpoints for transaction data

**Technical Requirements**:

- Ethers.js for blockchain interaction
- PostgreSQL or MongoDB for transaction and balance storage
- Basic error handling
- Unit tests for core functionality

**Assessment Focus**:

- Blockchain data handling
- API design
- Error handling patterns

### Additional Task for Senior Level: Smart Contract Event Indexer

**Objective**: Build a focused event indexer for a specific smart contract.

**Features**:

- Index events from a single smart contract
  - [0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9](https://sepolia.etherscan.io/address/0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9) - contract address for event retrieval
- Store events in the database
- Ability to continue indexing from where the application last stopped upon subsequent start
- Ability to get all stored events
- Ability to stop indexing events
- Provide REST API for querying events
- Basic aggregation endpoints (e.g., volume over time)

**Technical Requirements**:

- Ethers.js for event listening
- PostgreSQL or MongoDB for event storage
- Basic error handling and retry logic
- Unit tests

**Assessment Focus**:

- Event processing implementation
- Database schema design
- API performance
- Error handling

### Bonus Points:

- Implementing proper logging and monitoring
- Adding CI/CD pipeline configuration
- Adding API versioning strategy
- Adding rate limiting
- Adding caching
- Adding pagination for transaction/event GET

# Authentication API Endpoints

## Authentication

### POST /api/auth/register

Register a new user

```json
{
  "email": "string",
  "password": "string",
  "username": "string"
}
```

Response: 201 Created

```json
{
  "id": "uuid",
  "email": "string",
  "username": "string",
  "createdAt": "timestamp"
}
```

### POST /api/auth/login

Login with credentials

```json
{
  "email": "string",
  "password": "string"
}
```

Response: 200 OK

```json
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "expiresIn": 3600
}
```

### POST /api/auth/refresh

Refresh access token

```json
{
  "refreshToken": "string"
}
```

Response: 200 OK

```json
{
  "accessToken": "jwt_token",
  "expiresIn": 3600
}
```

### POST /api/auth/logout

Logout user (invalidate tokens)
Headers: Authorization: Bearer {token}
Response: 204 No Content

## User Profile

### GET /api/users/me

Get current user profile
Headers: Authorization: Bearer {token}
Response: 200 OK

```json
{
  "id": "uuid",
  "email": "string",
  "username": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### PUT /api/users/me

Update user profile
Headers: Authorization: Bearer {token}

```json
{
  "username": "string",
  "email": "string"
}
```

Response: 200 OK

```json
{
  "id": "uuid",
  "email": "string",
  "username": "string",
  "updatedAt": "timestamp"
}
```

### PUT /api/users/me/password

Change password
Headers: Authorization: Bearer {token}

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

Response: 204 No Content

## Error Responses

### 400 Bad Request

```json
{
  "error": "string",
  "message": "string",
  "details": {}
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

# Blockchain Transaction API Endpoints

## Transaction Data

### GET /api/eth/address/:address/transactions

Query Parameters:

- fromBlock (optional): Starting block number
- toBlock (optional): Ending block number (defaults to 'latest')

Get transactions for address

```json
Response 200:
{
  "transactions": [
    ...
  ],
}

```

### GET /api/eth/address/:address/balance

Get current balance

```json
Response 200:
{
  "address": "0x...",
  "balance": "1.5",
  "balanceWei": "1500000000000000000",
  "lastUpdated": "2024-02-10T12:00:00Z"
}

```

## Error Responses

### 400 Bad Request

```json
{
  "error": "InvalidAddress",
  "message": "Invalid Ethereum address format"
}
```

# Event Indexer API Endpoints

### POST /api/eth/contracts/:address/watch

Start indexing contract events

```json
Request:
{
  "eventSignature": "Transfer(address,address,uint256)",
  "fromBlock": 12345678  // optional
}

Response 200:
{
  "status": "started",
  "contractAddress": "0x...",
  "eventSignature": "Transfer(address,address,uint256)",
  "startBlock": 12345678
}

```

### GET /api/eth/contracts/:address/events

Get indexed events

```json
Query Parameters:
- fromBlock (optional): number
- toBlock (optional): number

Response 200:
{
  "events": [
    {
      "blockNumber": 12345678,
      "transactionHash": "0x...",
      "data": {
        "from": "0x...",
        "to": "0x...",
        "value": "1000000000000000000"
      },
      "timestamp": "2024-02-10T12:00:00Z"
    }
  ],
  "indexerStatus": {
    "lastIndexedBlock": 12345678,
    "isIndexing": true
  },
}

```

### DELETE /api/eth/contracts/:address/watch

Stop indexing contract events

```json
Response 200:
{
  "status": "stopped",
  "lastIndexedBlock": 12345678
}

```

### Error Responses

400 Bad Request

```json
{
  "error": "InvalidSignature",
  "message": "Invalid event signature format"
}
```

404 Not Found

```json
{
  "error": "ContractNotFound",
  "message": "Contract not found or not being indexed"
}
```
