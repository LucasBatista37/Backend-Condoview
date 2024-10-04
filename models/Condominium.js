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
  units: {
    type: Number,
    required: true,
  },
  foundationDate: {
    type: Date,
    required: true,
  },
  contactPhone: {
    type: String,
    required: true,
  },
  contactEmail: {
    type: String,
    required: true,
  },
  blocks: {
    type: Number,
    default: 1, 
  },
  parkingSpots: {
    type: Number,
    default: 0,
  },
  rules: {
    type: String,
  },
}, 
{
  timestamps: true,
});

const Condominium = mongoose.model("Condominium", condominiumSchema);

module.exports = Condominium;
