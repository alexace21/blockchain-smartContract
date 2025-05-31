let provider = null;

const initializeBlockchainConnection = async (contractAddress, abi) => {
    try {
        // if (config.infuraApiKey) {
            provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/6b15138c2072481f941b38b7cc96208f`);
        // } else if (config.alchemyApiKey) {
            // provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${config.alchemyApiKey}`);
        // } else {
        //     throw new Error("No Infura or Alchemy API key provided in config.");
        // }

        // Verify connection
        await provider.getBlockNumber();
        console.log('Ethers.js provider connected to Sepolia successfully.');

        // Instantiate the contract
        contract = new ethers.Contract(contractAddress, abi, provider);
        console.log(`Contract instance for ${contractAddress} created.`);

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