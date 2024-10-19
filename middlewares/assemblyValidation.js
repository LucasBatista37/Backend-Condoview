const { body } = require("express-validator");

const assemblyValidation = () => {
    return [
        body("title")
            .isString()
            .withMessage("O título da assembleia é obrigatório.")
            .isLength({ min: 3 })
            .withMessage("O título da assembleia deve ter pelo menos 3 caracteres."),
        
        body("description")
            .isString()
            .withMessage("A descrição da assembleia é obrigatória.")
            .isLength({ min: 5 })
            .withMessage("A descrição da assembleia deve ter pelo menos 5 caracteres."),
        
        body("date")
            .isISO8601()
            .withMessage("A data deve ser uma data válida (formato YYYY-MM-DD)."),
        
        body("approved")
            .optional()
            .isBoolean()
            .withMessage("A aprovação deve ser um valor booleano."),
    ];
};

module.exports = {
    assemblyValidation,
};
