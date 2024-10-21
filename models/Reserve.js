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
    hourStart: {
      type: String,
      required: true,
    },
    hourEnd: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["aprovado", "rejeitado", "pendente"],
      default: "pendente",
    },
  },
  {
    timestamps: true,
  }
);

const Reserve = mongoose.model("Reserve", ReserveSchema);

module.exports = Reserve;
