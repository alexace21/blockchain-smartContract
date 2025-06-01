const ethers = require('ethers');

let provider = null;
let contract = null;

const initializeBlockchainConnection = async (contractAddress, abi) => {
    try {
        provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        console.log('PROVIDER: ' + provider);

        // Verify connection
        const blockNumber = await provider.getBlockNumber();
        console.log('Ethers.js provider connected to Sepolia successfully.');
        console.log('Current block number:', blockNumber);

        // Instantiate the contract
        contract = new ethers.Contract(contractAddress, abi, provider);
        console.log(`Contract instance for ${contractAddress} created.`);
        
        // Verify contract has code
        const code = await provider.getCode(contractAddress);
        if (code === '0x') {
            throw new Error(`No contract code found at address ${contractAddress}`);
        }
        console.log('Contract code verified - contract exists on chain');
        
        // Optional: Try to read contract name/symbol if it's an ERC20
        try {
            if (contract.name) {
                const name = await contract.name();
                console.log('Contract name:', name);
            }
            if (contract.symbol) {
                const symbol = await contract.symbol();
                console.log('Contract symbol:', symbol);
            }
        } catch (e) {
            console.log('Could not read contract metadata (this is normal for some contracts)');
        }

    } catch (error) {
        console.error('Failed to initialize blockchain connection:', error.message);
        process.exit(1); // Exit if connection fails critically
    }
};

const getProvider = () => provider;
const getContract = () => contract;

module.exports = {
    initializeBlockchainConnection,
    getProvider,
    getContract,
};