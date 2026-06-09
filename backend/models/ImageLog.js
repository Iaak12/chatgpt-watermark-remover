const mongoose = require('mongoose');

const imageLogSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    processedPath: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ImageLog', imageLogSchema);
