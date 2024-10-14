const { body, validationResult } = require("express-validator");

const ocorrenciaValidation = () => {
  return [
    body("motivo")
      .isString()
      .withMessage("O motivo é obrigatório.")
      .isLength({ min: 3 })
      .withMessage("O motivo deve ter pelo menos 3 caracteres."),

    body("descricao")
      .isString()
      .withMessage("A descrição é obrigatória.")
      .isLength({ min: 5 })
      .withMessage("A descrição deve ter pelo menos 5 caracteres."),

    body("data")
      .isISO8601()
      .withMessage("A data deve ser uma data válida (formato YYYY-MM-DD).")
  ];
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  ocorrenciaValidation,
  handleValidationErrors,
};
