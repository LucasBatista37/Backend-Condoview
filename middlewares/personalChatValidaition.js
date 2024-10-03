const { body, validationResult } = require("express-validator");

const validateMessage = [
    body("receiver")
        .notEmpty()
        .withMessage("O campo 'receiver' é obrigatório.")
        .isMongoId()
        .withMessage("ID do receiver inválido."),
    body("message")
        .notEmpty()
        .withMessage("O campo 'message' é obrigatório.")
        .isLength({ max: 500 })
        .withMessage("A mensagem deve ter no máximo 500 caracteres."),
];

const checkValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    validateMessage,
    checkValidationErrors,
};
