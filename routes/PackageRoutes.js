const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    addPackage,
    getPackages,
    getPackageById,
    updatePackage,
    deletePackage,
} = require('../controllers/PackageController');
const { packageValidation, handleValidationErrors } = require('../middlewares/packageValidation');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/package'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); 
    },
});

const upload = multer({ storage });

router.post('/package', upload.single('imagePath'), packageValidation(), handleValidationErrors, addPackage);
router.get('/admin/package', getPackages);
router.get('/admin/package/:id', getPackageById);
router.put('/admin/package/:id', upload.single('imagePath'), handleValidationErrors, updatePackage);
router.delete('/admin/package/:id', deletePackage);

module.exports = router;
