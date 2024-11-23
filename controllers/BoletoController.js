const Boleto = require('../models/boleto.model');
const gerencianet = require('../config/gerencianet.config');

exports.gerarBoleto = async (req, res) => {
  const { usuario, valor, vencimento } = req.body;

  const body = {
    payment: {
      banking_billet: {
        expire_at: vencimento,
        customer: {
          name: usuario, 
          cpf: '12345678900', 
        },
        items: [{ name: 'Taxa de condomínio', value: valor }],
      },
    },
  };

  try {
    const response = await gerencianet.createCharge({}, body);

    const novoBoleto = await Boleto.create({
      usuario,
      valor,
      vencimento,
      status: 'pendente',
      url: response.data.url,
      codigoBarras: response.data.barcode,
    });

    res.status(201).json(novoBoleto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar o boleto' });
  }
};

exports.listarBoletos = async (req, res) => {
  try {
    const boletos = await Boleto.find();
    res.status(200).json(boletos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar boletos' });
  }
};