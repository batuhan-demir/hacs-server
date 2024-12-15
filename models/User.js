const mongoose = require("mongoose")
const { Schema } = mongoose

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "user"
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    city: {
        type: String
    },
    state: {
        type: String
    },
    country: {
        type: String
    },
    pincode: {
        type: String
    },
    language: {
        type: String,
        default: "en"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true, discriminatorKey: "role" })

module.exports = mongoose.model("User", userSchema)