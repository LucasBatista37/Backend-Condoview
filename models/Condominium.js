const mongoose = require("mongoose");
const { Schema } = mongoose;

const condominiumSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  cnpj: {
    type: String,
    required: true,
    unique: true,
  },
}, 
{
  timestamps: true,
});

const Condominium = mongoose.model("Condominium", condominiumSchema);

module.exports = Condominium;
