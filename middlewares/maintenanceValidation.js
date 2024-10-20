const { body } = require("express-validator");

const maintenanceValidation = () => {
    return [
        body("type")
            .isString()
            .withMessage("O tipo de manutenção é obrigatório.")
            .isLength({ min: 3 })
            .withMessage("O tipo de manutenção deve ter pelo menos 3 caracteres."),
        
        body("descriptionMaintenance")
            .isString()
            .withMessage("A descrição da manutenção é obrigatória.")
            .isLength({ min: 5 })
            .withMessage("A descrição da manutenção deve ter pelo menos 5 caracteres."),
        
        body("dataMaintenance")
            .isISO8601()
            .withMessage("A data deve ser uma data válida (formato YYYY-MM-DD)."),
        
        body("imagePath")
            .optional()
            .isString()
            .withMessage("O caminho da imagem deve ser uma string."),
        
        body("approvedMaintenance")
            .optional()
            .isBoolean()
            .withMessage("A aprovação deve ser um valor booleano."),
    ];
};

module.exports = {
    maintenanceValidation,
};
