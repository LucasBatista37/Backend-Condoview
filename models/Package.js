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
    type: {
        type: String,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User", 
        required: true,
    },
    condominiumId: {
        type: Schema.Types.ObjectId,
        ref: "Condominium",
        required: true,
    },
}, 
{
    timestamps: true,
});

const Package = mongoose.model("Package", PackageSchema);

module.exports = Package;
