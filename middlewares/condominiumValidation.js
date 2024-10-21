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
  ];
};

module.exports = {
  condominiumCreateValidation,
};
