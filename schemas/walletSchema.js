const mongoose = require('mongoose')


const walletSchema = mongoose.Schema({
    userId: {
        type: String,
    },
    wallet: {
        type: String
    },
    channelId: { 
        type: String
    },
    hash: {
        type: String,
        default: "0X"
    },
    channelName: {
        type: String
    },
    label: {
        type: String
    }
})

module.exports = mongoose.model('wallets', walletSchema)