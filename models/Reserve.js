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
      type: String, 
      required: true,
    },
    horarioFim: {
      type: String, 
      required: true,
    },
    status: {
      type: String,
      enum: ['Pendente', 'Aprovada', 'Rejeitada'], 
      default: 'Pendente',  
    },
    nomeUsuario: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Reserve = mongoose.model("Reserve", ReserveSchema);

module.exports = Reserve;
