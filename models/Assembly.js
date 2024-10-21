const mongoose = require("mongoose");
const { Schema } = mongoose;

const AssemblySchema = new Schema(
  {
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
    status: {
      type: String,
      enum: ["Pendente", "Em Andamento", "Encerrada"],
      default: "Pendente", 
    },
  },
  {
    timestamps: true,
  }
);

const Assembly = mongoose.model("Assembly", AssemblySchema);

module.exports = Assembly;
