const { body } = require("express-validator");

const condominiumCreateValidation = () => {
  return [
    body("name")
      .isString()
      .withMessage("O nome do condomínio é obrigatório.")
      .isLength({ min: 3 })
      .withMessage("O nome precisa ter no mínimo 3 caracteres."),
    body("address")
      .isString()
      .withMessage("O endereço é obrigatório."),
    body("cnpj")
      .isString()
      .withMessage("O CNPJ é obrigatório.")
      .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
      .withMessage("Insira um CNPJ válido no formato XX.XXX.XXX/XXXX-XX"),
    body("units")
      .isInt({ gt: 0 })
      .withMessage("O número de unidades deve ser um valor inteiro maior que zero."),
    body("foundationDate")
      .isISO8601()
      .toDate()
      .withMessage("Insira uma data de fundação válida."),
    body("contactPhone")
      .isString()
      .withMessage("O telefone de contato é obrigatório."),
    body("contactEmail")
      .isEmail()
      .withMessage("Insira um e-mail de contato válido."),
    body("blocks")
      .optional()
      .isInt({ min: 1 })
      .withMessage("O número de blocos deve ser um valor inteiro maior ou igual a 1."),
    body("parkingSpots")
      .optional()
      .isInt({ min: 0 })
      .withMessage("O número de vagas de estacionamento deve ser um valor inteiro não negativo."),
    body("rules")
      .optional()
      .isString()
      .withMessage("As regras devem ser uma string."),
  ];
};

module.exports = {
  condominiumCreateValidation,
};
