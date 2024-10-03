// packageValidation.js
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
            .withMessage("O apartamento é obrigatório.")
            .isLength({ min: 5 })
            .withMessage("O apartamento deve ter pelo menos 5 caracteres."),
        
        body("time")
            .isISO8601()
            .withMessage("A data/hora deve ser uma data válida (formato ISO 8601).")
            .custom((value) => {
                const date = new Date(value);
                if (date < new Date()) {
                    throw new Error("A data/hora não pode ser no passado.");
                }
                return true;
            }),
        
        body("imagePath")
            .optional()
            .isString()
            .withMessage("O caminho da imagem deve ser uma string."),

        body("type")
            .optional()
            .isString()
            .withMessage("O tipo deve ser uma string.")
            .isIn(["normal", "urgente", "reclamacao"]) 
            .withMessage("O tipo deve ser um dos seguintes: normal, urgente, reclamacao."),
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
