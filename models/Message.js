const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: String,
    recipient: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;