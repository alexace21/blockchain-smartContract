const express = require('express');
const BlockchainController = require('../controllers/blockchainController');
const { startIndexer, stopIndexer, getIndexerStatus, CONTRACT_ADDRESS } = require('../services/Indexer');
const { Event } = require('../models/Event');

const {
  validateSchema
} = require('../middlewares/validator');

const Joi = require('joi'); // For schema validation
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

const blockchainController = new BlockchainController();

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



// Input validation schemas
const watchSchema = Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const eventsQuerySchema = Joi.object({
    fromBlock: Joi.number().integer().min(0),
    toBlock: Joi.number().integer().min(0),
    eventName: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).optional(),
    sender: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
    recipient: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('block_number', 'timestamp', 'value').default('block_number'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
});



// Middleware for checking if the contract address matches our configured one
const checkContractAddress = (req, res, next) => {
    if (req.params.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        return res.status(400).json({ error: 'Indexer is configured for a different contract address.' });
    }
    next();
};

/**
 * @api {post} /api/eth/contracts/:address/watch Start Indexing
 * @apiDescription Starts the event indexing process for the specified contract.
 * @apiParam {String} address Contract address to watch. Must match configured address.
 * @apiSuccess {Object} message Success message.
 * @apiError (400) BadRequest Invalid contract address or indexer already running.
 */
router.post('/eth/contracts/:address/watch', protect, validateSchema(watchSchema, 'params'), checkContractAddress, async (req, res) => {
    const { fromBlock, eventSignature } = req.body;
    const address_contact = req.params.address;

        // Basic validation for eventSignature
    if (!eventSignature || typeof eventSignature !== 'string') {
        return res.status(400).json({ error: 'eventSignature is required and must be a string.' });
    }
    try {
        const responseData = await startIndexer(address_contact, fromBlock, eventSignature);

        return res.status(200).json(responseData);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @api {delete} /api/eth/contracts/:address/watch Stop Indexing
 * @apiDescription Stops the event indexing process for the specified contract.
 * @apiParam {String} address Contract address to stop watching. Must match configured address.
 * @apiSuccess {Object} message Success message.
 * @apiError (400) BadRequest Invalid contract address or indexer not running.
 */
router.delete('/eth/contracts/:address/watch', protect, validateSchema(watchSchema, 'params'), checkContractAddress, async (req, res) => {
    try {
        await stopIndexer();
        res.status(200).json({ message: 'Indexing stopped successfully.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @api {get} /api/eth/contracts/:address/events Query Events
 * @apiDescription Retrieves indexed events for a specific contract.
 * @apiParam {String} address Contract address. Must match configured address.
 * @apiQuery {Number} [fromBlock] Start block number (inclusive).
 * @apiQuery {Number} [toBlock] End block number (inclusive).
 * @apiQuery {String} [eventName] Filter by event name (e.g., "Transfer").
 * @apiQuery {String} [sender] Filter by sender address.
 * @apiQuery {String} [recipient] Filter by recipient address.
 * @apiQuery {Number} [limit=10] Number of results per page. Max 100.
 * @apiQuery {Number} [offset=0] Number of results to skip.
 * @apiQuery {String} [sortBy=block_number] Field to sort by (block_number, timestamp, value).
 * @apiQuery {String} [sortOrder=DESC] Sort order (ASC or DESC).
 * @apiSuccess {Object[]} events List of indexed events.
 * @apiError (400) BadRequest Invalid parameters.
 */
router.get('/eth/contracts/:address/events', protect, validateSchema(eventsQuerySchema, 'query'), checkContractAddress, async (req, res) => {
    try {
        const { fromBlock, toBlock, eventName, sender, recipient, limit, offset, sortBy, sortOrder } = req.query;
        const contractAddress = req.params.address;

        const filters = { contractAddress, fromBlock, toBlock, eventName, sender, recipient };
        const options = { limit, offset, sortBy, sortOrder };

        const events = await Event.find(filters, options);
        res.status(200).json(events);
    } catch (error) {
        console.error('Error querying events:', error);
        res.status(500).json({ error: 'Failed to retrieve events' });
    }
});

/**
 * @api {get} /api/eth/contracts/:address/volume Aggregate Volume
 * @apiDescription Aggregates transfer volume for a specific contract by time interval.
 * @apiParam {String} address Contract address. Must match configured address.
 * @apiQuery {String} [interval=daily] Aggregation interval (hourly, daily, monthly).
 * @apiQuery {Number} [from] Start Unix timestamp.
 * @apiQuery {Number} [to] End Unix timestamp.
 * @apiSuccess {Object[]} data Aggregated volume data.
 * @apiError (400) BadRequest Invalid parameters.
 */


/**
 * @api {get} /api/eth/indexer/status Get Indexer Status
 * @apiDescription Retrieves the current status of the event indexer.
 * @apiSuccess {Object} status Indexer status including running state, last processed block, and chain tip.
 */
router.get('/eth/indexer/status', protect, async (req, res) => {
    try {
        const status = await getIndexerStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error getting indexer status:', error);
        res.status(500).json({ error: 'Failed to retrieve indexer status' });
    }
});

router.get('/eth/address/:address/transactions', protect, blockchainController.fetchTransactions.bind(blockchainController));
router.get('/eth/address/:address/balance', protect, blockchainController.fetchBalance.bind(blockchainController));

module.exports = router;