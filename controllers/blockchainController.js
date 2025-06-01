const BlockchainService = require('../services/blockchainService');
const User = require('../models/User');
const {ethers} = require("ethers");

class BlockchainController {
    constructor() {
        this.blockchainService = new BlockchainService();
    }


    async fetchTransactions(req, res) {
        try {
            const { address } = req.params;
            const { fromBlock, toBlock } = req.query;
            const userId = req.user.toString();

            // Validate address
            if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({ 
                    error: 'Invalid Ethereum address format' 
                });
            }

            console.log(`Processing transactions for address: ${address}`);
            
            const transactions = await this.blockchainService.fetchTransactions(
                address, 
                fromBlock, 
                toBlock,
                userId
            );

            res.json({
                transactions: transactions
            });

        } catch (error) {
            console.error('Error in fetchTransactions:', error);
            res.status(500).json({ 
                error: 'Failed to fetch and store transactions',
                details: error.message 
            });
        }
    }

    // Utility function to validate Ethereum address
    isValidAddress(address) {
        return ethers.isAddress(address);
    }

    async fetchBalance(req, res) {
        try {
            const { address } = req.params;
            const userId = req.user._id.toString();

            if (!this.isValidAddress(address)) {
                return res.status(400).json({
                    error: 'InvalidAddress',
                    message: 'Invalid Ethereum address format'
                });
            }

            // Validate address
            if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({ 
                    error: 'Invalid Ethereum address format' 
                });
            }


            const balanceData = await this.blockchainService.getBalance(address);

            await this.blockchainService.storeBalance(
                address, 
                balanceData.balance, 
                balanceData.blockNumber,
                userId
            );

            return res.status(200).json({
                address,
                balance: balanceData.formattedBalance,
                balanceWei: balanceData.balance.toString(),
                lastUpdated: new Date().toISOString()
            });

        } catch (error) {
            console.error("Failed to fetch balance:", error);
            return res.status(500).json({ error: 'ServerError', message: 'Failed to fetch balance' });
        }
    }
}

module.exports = BlockchainController;