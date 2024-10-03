const { body } = require("express-validator");

const noticeValidation = () => {
    return [
        body("title")
            .isString()
            .withMessage("O título do aviso é obrigatório.")
            .isLength({ min: 3 })
            .withMessage("O título do aviso deve ter pelo menos 3 caracteres."),
        
        body("message")
            .isString()
            .withMessage("A mensagem do aviso é obrigatória.")
            .isLength({ min: 5 })
            .withMessage("A mensagem do aviso deve ter pelo menos 5 caracteres."),
        
        body("date")
            .isISO8601()
            .withMessage("A data deve ser uma data válida (formato YYYY-MM-DD).")
            .custom((value) => {
                const date = new Date(value);
                if (date < new Date()) {
                    throw new Error("A data não pode ser no passado.");
                }
                return true;
            }),
        
        body("imagePath")
            .optional()
            .isString()
            .withMessage("O caminho da imagem deve ser uma string."),
        
        body("approved")
            .optional()
            .isBoolean()
            .withMessage("A aprovação deve ser um valor booleano."),
    ];
};

module.exports = {
    noticeValidation,
};