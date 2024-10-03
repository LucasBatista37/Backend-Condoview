const mongoose = require("mongoose");
const { Schema } = mongoose;

const AssemblySchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
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

const Assembly = mongoose.model("Assembly", AssemblySchema);

module.exports = Assembly;
