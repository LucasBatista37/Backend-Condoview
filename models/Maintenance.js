const mongoose = require("mongoose");
const { Schema } = mongoose;

const MaintenanceSchema = new Schema(
  {
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
    status: {
      type: String,
      enum: ['Pendente', 'Aprovada', 'Rejeitada'],
      default: 'Pendente',
    },
    usuarioNome: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Maintenance = mongoose.model("Maintenance", MaintenanceSchema);

module.exports = Maintenance;

