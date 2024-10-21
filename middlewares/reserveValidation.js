const { body } = require("express-validator");

const reserveValidation = () => {
  return [
    body("area")
      .isString()
      .withMessage("A área é obrigatória.")
      .isLength({ min: 3 })
      .withMessage("A área deve ter pelo menos 3 caracteres."),

    body("descricao")
      .isString()
      .withMessage("A descrição é obrigatória.")
      .isLength({ min: 5 })
      .withMessage("A descrição deve ter pelo menos 5 caracteres."),

    body("data")
      .isISO8601()
      .withMessage("A data deve ser uma data válida (formato YYYY-MM-DD)."),

    body("hourStart")
      .isString()
      .withMessage("A hora de início é obrigatória.")
      .custom((value) => {
        const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!regex.test(value)) {
          throw new Error("A hora de início deve estar no formato HH:mm.");
        }
        return true;
      }),

    body("hourEnd")
      .isString()
      .withMessage("A hora de fim é obrigatória.")
      .custom((value, { req }) => {
        const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!regex.test(value)) {
          throw new Error("A hora de fim deve estar no formato HH:mm.");
        }

        if (value <= req.body.hourStart) {
          throw new Error("A hora de fim deve ser maior que a hora de início.");
        }
        return true;
      }),

    body("status")
      .optional()
      .isIn(["aprovado", "rejeitado", "pendente"])
      .withMessage("O status deve ser 'aprovado', 'rejeitado' ou 'pendente'."),
  ];
};

module.exports = {
  reserveValidation,
};
