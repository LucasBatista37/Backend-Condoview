// models/Reserve.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReserveSchema = new Schema(
  {
    area: {
      type: String,
      required: true,
    },
    descricao: {
      type: String,
      required: true,
    },
    data: {
      type: Date,
      required: true,
    },
    horarioInicio: {
      type: String, // ou TimeOfDay, dependendo da sua implementação
      required: true,
    },
    horarioFim: {
      type: String, // ou TimeOfDay, dependendo da sua implementação
      required: true,
    },
    status: {
      type: String,
      enum: ['Pendente', 'Aprovada', 'Rejeitada'], 
      default: 'Pendente',  
    },
  },
  {
    timestamps: true,
  }
);

const Reserve = mongoose.model("Reserve", ReserveSchema);

module.exports = Reserve;
