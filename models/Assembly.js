const mongoose = require("mongoose");
const { Schema } = mongoose;

const AssemblySchema = new Schema(
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
    imagePath: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Assembly = mongoose.model("Assembly", AssemblySchema);

module.exports = Assembly;
