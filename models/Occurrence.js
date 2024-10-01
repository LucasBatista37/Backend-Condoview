const mongoose = require('mongoose');

const OcorrenciaSchema = new mongoose.Schema({
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
}, {
    timestamps: true,
});

const Ocorrencia = mongoose.model('Ocorrencia', OcorrenciaSchema);

module.exports = Ocorrencia;
