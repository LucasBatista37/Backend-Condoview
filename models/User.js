const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    nome: String,
    email: String,
    senha: String,
    profileImage: String,
    role: {
        type: String,
        enum: ['administrador', 'morador', 'sindico'], 
        default: 'morador', 
    },
    condominium: { type: mongoose.Schema.Types.ObjectId, ref: 'Condominium' } 
}, {
    timestamps: true
});

const User = mongoose.model("User", userSchema);

module.exports = User;