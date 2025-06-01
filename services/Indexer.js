const { getProvider, getContract, getContractABI } = require('../config/initBlockchainConnection');
const IndexerState = require('../models/IndexerState'); // Mongoose model for indexer state
const { Event } = require('../models/Event'); // PostgreSQL model for events
const logger = require('../utils/logger'); // Simple logging utility

const CONTRACT_ADDRESS = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';
const START_BLOCK = 4888290; // Replace with actual contract deployment block or desired start

let isIndexing = false;
let indexerLoopInterval;
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const BLOCK_CHUNK_SIZE = 2000; // Process 2000 blocks at a time
let currentWatchConfig = null;
async function getEventFilter(eventName) {
    const contract = getContract();
    if (!contract) {
        throw new Error("Contract not initialized for event filter.");
    }

    // Get the event fragment from the contract's interface using the eventName
    const eventFragment = contract.interface.getEvent(eventName);
    if (!eventFragment) {
        throw new Error(`Event "${eventName}" not found in contract ABI. Double check the event name and ABI.`);
    }

    // Ethers.js v6 now has topicHash directly on the event fragment
    const topic = eventFragment.topicHash;

    // Return the filter object
    return {
        address: contract.target, // In ethers v6, contract.address is now contract.target
        topics: [topic]
    };
}


function checkABI() {
    const contract = getContract();
    const transferEvent = contract.interface.fragments.find(
        f => f.type === 'event' && f.name === 'Transfer'
    );
    
    if (transferEvent) {
        console.log('Transfer event found in ABI:', transferEvent);
        console.log('Event signature:', transferEvent.format());
    } else {
        console.log('Transfer event NOT found in ABI');
        console.log('Available events:', 
            contract.interface.fragments
                .filter(f => f.type === 'event')
                .map(f => f.name)
        );
    }
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
        logger.debug(`Using filter: ${JSON.stringify(filter)}`); // Log the actual filter being sent
 // NEW: Log the time taken for the RPC call
        const rpcStartTime = Date.now();
        const events = await contract.queryFilter(eventName, fromBlock, toBlock);
        const rpcEndTime = Date.now();
        logger.debug(`RPC queryFilter took ${rpcEndTime - rpcStartTime}ms and returned ${events.length} events.`);

        logger.info(`Found ${events.length} "${eventName}" events in block range ${fromBlock}-${toBlock}`);
        if (events.length > 0) {
           logger.debug(`Raw events from RPC: ${JSON.stringify(events.map(e => ({
                blockNumber: e.blockNumber,
                transactionHash: e.transactionHash,
                logIndex: e.logIndex,
                event: e.event, // Event name as identified by ethers.js (e.g., 'Transfer')
                address: e.address,
                topics: e.topics,
                data: e.data
            })))}`);
                for (const event of events) {
                try {
                    logger.debug(`Processing event log: Block ${event.blockNumber}, Tx ${event.transactionHash}, LogIndex ${event.index}, Event Name: ${event.eventName}`);

                    const block = await event.getBlock();
                    const tx = await event.getTransaction();

                    // Parse event arguments using contract.interface
                    let parsedArgs; 
                     try {
                        parsedArgs = contract.interface.parseLog(event);
                        if (!parsedArgs) {
                            logger.warn(`Failed to parse log for event at Block ${event.blockNumber}, Tx ${event.transactionHash}. ` +
                                        `This might mean the ABI is incorrect or log data is malformed. Skipping.`);
                            continue;
                        }
                    } catch (parseError) {
                        logger.error(`Error parsing event log for Block ${event.blockNumber}, Tx ${event.transactionHash}:`, parseError);
                        continue; // Skip to next event if parsing fails
                    }

                    const eventData = {
                        contract_address: event.address,
                        event_name: event.eventName,
                        block_number: event.blockNumber,
                        transaction_hash: event.transactionHash,
                        log_index: event.index,
                        timestamp: block.timestamp, // Unix timestamp
                        block_hash: event.blockHash, // Important for reorg checks if needed
                        sender_address: parsedArgs.args.src, // Example for Transfer event
                        recipient_address: parsedArgs.args.dst, // Example for Transfer event
                        value: parsedArgs.args.wad.toString(), // Convert BigInt to string
                    };
                    logger.debug(`Attempting to save eventData: ${JSON.stringify(eventData)}`);

                    
                    // Upsert: Try to insert, if conflict (unique constraint on txHash, logIndex), update
                    await Event.upsert(eventData, {
                        conflictFields: ['transaction_hash', 'log_index'], // Define unique constraint in model
                        updateOnDuplicate: ['block_number', 'timestamp', 'raw_args_json', 'sender_address', 'recipient_address', 'value']
                    });
                    logger.debug(`Successfully indexed event: ${event.eventName} from block ${event.blockNumber} (Tx: ${event.transactionHash})`);
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

async function runIndexer(startBlock) {
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
        let fromBlock;
        if (startBlock) {
            fromBlock = startBlock;
        } else {
            fromBlock = state ? state.lastProcessedBlock + 1 : START_BLOCK;
        }

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

async function verifyContract() {
    const contract = getContract();
    const provider = getProvider();
    
    // Check if contract exists
    const code = await provider.getCode(contract.target || contract.address);
    console.log('Contract has code:', code !== '0x');
    
    // Try to call a view function if available
    try {
        if (contract.name) {
            const name = await contract.name();
            console.log('Token name:', name);
        }
        if (contract.symbol) {
            const symbol = await contract.symbol();
            console.log('Token symbol:', symbol);
        }
    } catch (error) {
        console.log('Could not read contract details:', error.message);
    }
}

async function startIndexer(address_contact, fromBlock, eventSignature) {
        this.currentWatchConfig = {
        contractAddress: address_contact,
        eventSignature: eventSignature,
        contractABI: getContractABI, // Store the ABI here
        lastKnownBlock: null, // Will be updated by runIndexer/updateIndexerState
    };
    if (isIndexing) {
        logger.warn('Indexer is already running.');
        return;
    }
    isIndexing = true;
    let state = await IndexerState.findById('globalIndexer');
    if (state) {
        state.isRunning = true;
        state.contractAddress = address_contact; // Update state with current contract
        state.eventSignature = eventSignature;   // Update state with current event
        await state.save();
    } else {
        await IndexerState.create({ _id: 'globalIndexer', lastProcessedBlock: START_BLOCK -1, isRunning: true, contractAddress: address_contact,
            eventSignature: eventSignature });
    }
    verifyContract()
    checkABI();

    logger.info('Starting indexer...');
    // Execute immediately and then on interval
    runIndexer(fromBlock);
    indexerLoopInterval = setInterval(runIndexer, POLL_INTERVAL_MS);

        // Return immediately to the client that the process has started
    return {
        status: "started",
        contractAddress: address_contact,
        eventSignature: eventSignature,
        startBlock: fromBlock || (state ? state.lastProcessedBlock + 1 : START_BLOCK)
    };
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