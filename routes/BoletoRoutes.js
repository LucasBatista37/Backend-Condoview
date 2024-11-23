const express = require('express');
const { gerarBoleto, listarBoletos } = require('../controllers/boleto.controller');
const router = express.Router();

router.post('/boleto/gerar', gerarBoleto);

router.get('/boleto', listarBoletos);

module.exports = router;