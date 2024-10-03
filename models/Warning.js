const mongoose = require("mongoose");
const { Schema } = mongoose;

const NoticeSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    imagePath: {
        type: String,
    },
    approved: {
        type: Boolean,
        default: false,
    },
}, 
{
    timestamps: true,
});

const Notice = mongoose.model("Notice", NoticeSchema);

module.exports = Notice;
