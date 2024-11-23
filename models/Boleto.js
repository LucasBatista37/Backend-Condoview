const mongoose = require('mongoose');

const BoletoSchema = new mongoose.Schema({
  usuario: {
    type: String,
    required: true,
  },
  valor: {
    type: Number,
    required: true,
  },
  vencimento: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pendente', 'pago', 'cancelado'],
    default: 'pendente',
  },
  url: {
    type: String,
    required: true,
  },
  codigoBarras: {
    type: String,
  },
});

module.exports = mongoose.model('Boleto', BoletoSchema);
