const Gerencianet = require('gn-api-sdk-node');

const gnConfig = {
  client_id: 'SEU_CLIENT_ID',
  client_secret: 'SEU_CLIENT_SECRET',
  sandbox: true,
};

const gerencianet = new Gerencianet(gnConfig);

module.exports = gerencianet;
