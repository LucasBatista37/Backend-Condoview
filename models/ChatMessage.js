const mongoose = require("mongoose");
const { Schema } = mongoose;

const ChatMessageSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      ref: "User",
    },
    userName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: null,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);

module.exports = ChatMessage;
