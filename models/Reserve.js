const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReserveSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    condominiumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Condominium",
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
    description: {
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
    approved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Reserve = mongoose.model("Reserve", ReserveSchema);

module.exports = Reserve;
