const BlockchainService = require('../services/blockchainService');
const User = require('../models/User');
const {ethers} = require("ethers");

class BlockchainController {
    constructor() {
        this.blockchainService = new BlockchainService();
    }

    async addWalletAddress(req, res) {
        try {
            const { walletAddress } = req.body;
            const userId = req.user._id;

            // Validate address format
            if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
                return res.status(400).json({ 
                    error: 'Invalid Ethereum address format' 
                });
            }

            // Update user with wallet address
            await User.findByIdAndUpdate(userId, { 
                walletAddress,
                isWalletVerified: true 
            });

            res.json({
                success: true,
                message: 'Wallet address added successfully',
                walletAddress
            });

        } catch (error) {
            console.error('Error adding wallet address:', error);
            res.status(500).json({ 
                error: 'Failed to add wallet address',
                details: error.message 
            });
        }
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

    // async getTransactions(req, res) {
    //     try {
    //         const { page = 1, limit = 50 } = req.query;
    //         const userId = req.user._id.toString();
    //
    //         const result = await this.blockchainService.getUserTransactions(userId, page, limit);
    //
    //         res.json({
    //             success: true,
    //             userId,
    //             ...result
    //         });
    //
    //     } catch (error) {
    //         console.error('Error in getTransactions:', error);
    //         res.status(500).json({
    //             error: 'Failed to retrieve transactions',
    //             details: error.message
    //         });
    //     }
    // }

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

    async getBalances(req, res) {
        try {
            const userId = req.user._id.toString();

            const balances = await this.blockchainService.getUserBalances(userId);

            res.json({
                success: true,
                userId,
                balances
            });

        } catch (error) {
            console.error('Error in getBalances:', error);
            res.status(500).json({ 
                error: 'Failed to retrieve balances',
                details: error.message 
            });
        }
    }

    // View methods for rendering pages
    async walletPage(req, res) {
        const user = await User.findById(req.user._id);
        res.render('blockchain/wallet', { 
            user,
            title: 'My Wallet'
        });
    }

    async transactionsPage(req, res) {
        const userId = req.user._id.toString();
        const { page = 1 } = req.query;
        
        try {
            const result = await this.blockchainService.getUserTransactions(userId, page, 10);
            
            res.render('blockchain/transactions', { 
                ...result,
                title: 'My Transactions'
            });
        } catch (error) {
            res.render('blockchain/transactions', { 
                transactions: [],
                error: 'Failed to load transactions',
                title: 'My Transactions'
            });
        }
    }
}

module.exports = BlockchainController;