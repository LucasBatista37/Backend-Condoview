const { body } = require("express-validator");

const userCreateValidation = () => {
  return [
    body("nome")
      .isString()
      .withMessage("O nome é obrigatório.")
      .isLength({ min: 3 })
      .withMessage("O nome precisa ter no mínimo 3 caraceteres."),
    body("email")
      .isString()
      .withMessage("O e-mail é obrigatório.")
      .isEmail()
      .withMessage("insira um e-mail válido"),
    body("senha")
      .isString()
      .withMessage("A senha é obrigatória")
      .isLength({ min: 5 })
      .withMessage("A senha precisa ter no mínimo 5 caracteres"),
  ];
};

const loginValidation = () => {
  return [
    body("email")
      .isString()
      .notEmpty().withMessage("O e-mail é obrigatório.") 
      .isEmail()
      .withMessage("Insira um e-mail válido"),
    body("senha")
      .notEmpty().withMessage("A senha é obrigatória.") 
  ];
};

const userUpdateValidation = () => {
  
  return [
    body("name")
      .optional()
      .isLength({min: 3})
      .withMessage("O nome precisa de pelo menos 3 caracteres."),
    body("password")
      .optional()
      .isLength({min: 5})
      .withMessage("A senha precisa ter no mínimo 5 caracteres."),
    body("telefone")
      .optional()
      .matches(/^\d{10,11}$/)
      .withMessage("O telefone deve ter 10 ou 11 dígitos."),
  ]
}

module.exports = {
  userCreateValidation,
  loginValidation,
  userUpdateValidation,
};
