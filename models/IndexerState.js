const mongoose = require('mongoose');

const IndexerStateSchema = new mongoose.Schema({
    _id: { type: String, default: 'globalIndexer' }, // Use a fixed ID for the single indexer state
    lastProcessedBlock: { type: Number, required: true, default: 0 },
    isRunning: { type: Boolean, required: true, default: false },
    errorCount: { type: Number, default: 0 },
    lastError: { type: String },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Update `updatedAt` on save
IndexerStateSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('IndexerState', IndexerStateSchema);