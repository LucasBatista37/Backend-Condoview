const { body, validationResult } = require("express-validator");

const packageValidation = () => {
    return [
        body("title")
            .isString()
            .withMessage("O título é obrigatório.")
            .isLength({ min: 3 })
            .withMessage("O título deve ter pelo menos 3 caracteres."),
        
        body("apartment")
            .isString()
            .withMessage("O apartamento é obrigatório."),
        body("time")
            .isISO8601()
            .withMessage("A data/hora deve ser uma data válida (formato ISO 8601)."),     
        body("imagePath")
            .optional()
            .isString()
            .withMessage("O caminho da imagem deve ser uma string."),
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
    packageValidation,
    handleValidationErrors,
};
