const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    name: String,
    email: String,
    password: String,
    profileImage: String,
    bio: String,
    role: {
        type: String,
        enum: ['administrador', 'morador', 'sindico'], 
        default: 'morador', 
    }
}, 
{
    timestamps: true
});

const User = mongoose.model("User", userSchema);

module.exports = User;