const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    criarOcorrencia,
    obterOcorrencias,
    atualizarOcorrencia,
    deletarOcorrencia,
} = require('../controllers/OccurrenceController');
const { ocorrenciaValidation } = require('../middlewares/occurrenceValidation');
const { handleValidationErrors } = require('../middlewares/occurrenceValidation'); 
const authGuard = require('../middlewares/authGuard');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/occurrences'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); 
    },
});

const upload = multer({ storage });

router.post('/ocorrencias',authGuard, upload.single('imagem'), ocorrenciaValidation(), handleValidationErrors, criarOcorrencia);
router.put('/ocorrencias/:id', authGuard, upload.single('imagem'), handleValidationErrors, atualizarOcorrencia);
router.delete('/ocorrencias/:id', authGuard, deletarOcorrencia);

router.get('/admin/ocorrencias', authGuard, obterOcorrencias);

module.exports = router;
