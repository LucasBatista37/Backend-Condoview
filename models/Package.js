const mongoose = require("mongoose");
const { Schema } = mongoose;

const PackageSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    apartment: {
        type: String,
        required: true,
    },
    time: {
        type: Date,
        required: true,
    },
    imagePath: {
        type: String,
    },
    status: {
        type: String,
        required: false,
    },
}, 
{
    timestamps: true,
});

const Package = mongoose.model("Package", PackageSchema);

module.exports = Package;
