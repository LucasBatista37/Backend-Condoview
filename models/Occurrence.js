const mongoose = require("mongoose");
const { Schema } = mongoose;

const OcorrenciaSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, 
    },
    condominiumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Condominium",
      required: false,
    }, 
    motivo: {
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
    imagemPath: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Ocorrencia = mongoose.model("Ocorrencia", OcorrenciaSchema);

module.exports = Ocorrencia;
