const { body } = require("express-validator");

const chatValidation = () => {
    return [
        body("message")
            .isString()
            .withMessage("A mensagem deve ser um texto.")
            .isLength({ min: 1 })
            .withMessage("A mensagem não pode estar vazia.")
            .isLength({ max: 500 })
            .withMessage("A mensagem deve ter no máximo 500 caracteres."),
    ];
};

module.exports = {
    chatValidation,
};
