const mongoose = require("mongoose");
const { Schema } = mongoose;

const MaintenanceSchema = new Schema(
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
    type: {
      type: String,
      required: true,
    },
    descriptionMaintenance: {
      type: String,
      required: true,
    },
    dataMaintenance: {
      type: Date,
      required: true,
    },
    imagePath: {
      type: String,
    },
    approvedMaintenance: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Maintenance = mongoose.model("Maintenance", MaintenanceSchema);

module.exports = Maintenance;
