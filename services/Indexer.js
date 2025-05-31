const { getProvider, getContract } = require('../config/initBlockchainConnection');
const IndexerState = require('../models/IndexerState'); // Mongoose model for indexer state
const { Event } = require('../models/Event'); // PostgreSQL model for events
const logger = require('../utils/logger'); // Simple logging utility

const CONTRACT_ADDRESS = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';
const TRANSFER_EVENT_ABI = 'event Transfer(address indexed from, address indexed to, uint256 value)';
const START_BLOCK = 1000000; // Replace with actual contract deployment block or desired start

let isIndexing = false;
let indexerLoopInterval;
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const BLOCK_CHUNK_SIZE = 2000; // Process 2000 blocks at a time

async function getEventFilter(eventName) {
    const contract = getContract();
    if (!contract) {
        throw new Error("Contract not initialized for event filter.");
    }
    // Ethers.js automatically handles event signature parsing for filters
    const filter = contract.filters[eventName]();
    if (!filter) {
        // Fallback for events that might not have a direct filter property (e.g., if ABI is minimal)
        // Or directly construct it if you know the topic
        const topic = ethers.id(eventName + '(' + contract.interface.getEvent(eventName).inputs.map(i => i.type).join(',') + ')');
        return {
            address: contract.target,
            topics: [topic]
        };
    }
    return filter;
}

async function processEvents(fromBlock, toBlock, eventName) {
    const contract = getContract();
    if (!contract) {
        logger.error('Contract not initialized, cannot process events.');
        return;
    }

    try {
        const filter = await getEventFilter(eventName);
        logger.info(`Querying events from block ${fromBlock} to ${toBlock} for event "${eventName}"`);
        const events = await contract.queryFilter(filter, fromBlock, toBlock);

        if (events.length > 0) {
            logger.info(`Found ${events.length} "${eventName}" events in block range ${fromBlock}-${toBlock}`);
            for (const event of events) {
                try {
                    const block = await event.getBlock();
                    const tx = await event.getTransaction();

                    // Parse event arguments using contract.interface
                    const parsedArgs = contract.interface.parseLog(event);

                    const eventData = {
                        contract_address: event.address,
                        event_name: event.eventName,
                        block_number: event.blockNumber,
                        transaction_hash: event.transactionHash,
                        log_index: event.index,
                        timestamp: block.timestamp, // Unix timestamp
                        block_hash: event.blockHash, // Important for reorg checks if needed
                        sender_address: parsedArgs.args.from, // Example for Transfer event
                        recipient_address: parsedArgs.args.to, // Example for Transfer event
                        value: parsedArgs.args.value.toString(), // Convert BigInt to string
                        raw_args_json: parsedArgs.args // Store all args as JSONB
                    };
                    
                    // Upsert: Try to insert, if conflict (unique constraint on txHash, logIndex), update
                    await Event.upsert(eventData, {
                        conflictFields: ['transaction_hash', 'log_index'], // Define unique constraint in model
                        updateOnDuplicate: ['block_number', 'timestamp', 'raw_args_json', 'sender_address', 'recipient_address', 'value']
                    });
                    logger.debug(`Indexed event: ${event.eventName} from block ${event.blockNumber}`);
                } catch (eventProcessError) {
                    logger.error(`Error processing single event ${event.transactionHash}-${event.logIndex}: ${eventProcessError.message}`);
                    // Decide whether to throw or continue. For robustness, usually continue and log.
                }
            }
        }
        return true; // Indicate success
    } catch (error) {
        logger.error(`Error querying events for range ${fromBlock}-${toBlock}: ${error.message}`);
        throw error; // Re-throw to trigger retry logic
    }
}

async function updateIndexerState(lastBlock) {
    await IndexerState.findOneAndUpdate(
        { _id: 'globalIndexer' }, // Unique identifier for our single indexer instance
        { lastProcessedBlock: lastBlock, isRunning: isIndexing, updatedAt: new Date() },
        { upsert: true, new: true } // Create if not exists, return updated doc
    );
}

let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds initial delay

async function runIndexer() {
    if (!isIndexing) {
        logger.info('Indexer stopped.');
        return;
    }

    const provider = getProvider();
    if (!provider) {
        logger.error('Provider not initialized. Cannot run indexer.');
        return;
    }

    try {
        let state = await IndexerState.findById('globalIndexer');
        let currentBlock = await provider.getBlockNumber();
        let fromBlock = state ? state.lastProcessedBlock + 1 : START_BLOCK;

        if (fromBlock > currentBlock) {
            logger.info(`Indexer is caught up. Waiting for new blocks. Current: ${currentBlock}, Last Indexed: ${fromBlock - 1}`);
            retryCount = 0; // Reset retry count if caught up
            return;
        }

        let toBlock = Math.min(fromBlock + BLOCK_CHUNK_SIZE - 1, currentBlock);

        logger.info(`Indexing from ${fromBlock} to ${toBlock} (Current chain tip: ${currentBlock})`);

        await processEvents(fromBlock, toBlock, 'Transfer'); // Process 'Transfer' events

        await updateIndexerState(toBlock); // Update cursor after successful processing
        retryCount = 0; // Reset retry count on success
    } catch (error) {
        logger.error(`Indexer run failed: ${error.message}`);
        retryCount++;
        if (retryCount <= MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1); // Exponential backoff
            logger.warn(`Retrying indexer in ${delay / 1000} seconds... (Attempt ${retryCount}/${MAX_RETRIES})`);
            // No need for a manual setTimeout here, as the loop naturally delays via POLL_INTERVAL_MS
            // but we might want to skip the current iteration of the loop.
            // For production, consider using a queue or specific retry library like `p-retry`.
        } else {
            logger.error(`Max retries reached. Indexer stopping due to persistent error.`);
            isIndexing = false; // Stop the indexer
            await updateIndexerState(state ? state.lastProcessedBlock : START_BLOCK); // Persist last known good block
        }
    }
}

async function startIndexer() {
    if (isIndexing) {
        logger.warn('Indexer is already running.');
        return;
    }
    isIndexing = true;
    let state = await IndexerState.findById('globalIndexer');
    if (state) {
        state.isRunning = true;
        await state.save();
    } else {
        await IndexerState.create({ _id: 'globalIndexer', lastProcessedBlock: START_BLOCK -1, isRunning: true });
    }

    await initializeBlockchainConnection(CONTRACT_ADDRESS, [TRANSFER_EVENT_ABI]);
    logger.info('Starting indexer...');
    // Execute immediately and then on interval
    await runIndexer();
    indexerLoopInterval = setInterval(runIndexer, POLL_INTERVAL_MS);
}

async function stopIndexer() {
    if (!isIndexing) {
        logger.warn('Indexer is not running.');
        return;
    }
    isIndexing = false;
    clearInterval(indexerLoopInterval);
    await updateIndexerState((await IndexerState.findById('globalIndexer')).lastProcessedBlock); // Ensure state is saved
    logger.info('Indexer stopped.');
}

async function getIndexerStatus() {
    const state = await IndexerState.findById('globalIndexer');
    const provider = getProvider();
    let currentBlock = 0;
    if (provider) {
        try {
            currentBlock = await provider.getBlockNumber();
        } catch (error) {
            logger.error(`Could not get current block number: ${error.message}`);
        }
    }
    return {
        isRunning: isIndexing, // Runtime status
        persistedState: state ? state.toObject() : null, // Persisted state from DB
        chainTip: currentBlock,
        contractAddress: CONTRACT_ADDRESS,
        lastUpdated: state ? state.updatedAt : null,
        errors: state ? state.errorCount : 0 // Should be incremented in catch blocks
    };
}

module.exports = {
    startIndexer,
    stopIndexer,
    getIndexerStatus,
    CONTRACT_ADDRESS
};