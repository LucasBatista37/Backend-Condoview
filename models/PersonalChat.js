const mongoose = require("mongoose");
const { Schema } = mongoose;

const PersonalChatSchema = new Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    image: {
        type: String, 
        required: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

const PersonalChatMessage = mongoose.model("PersonalChatMessage", PersonalChatSchema);

module.exports = PersonalChatMessage;
