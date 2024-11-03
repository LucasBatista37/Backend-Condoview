const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/assembly");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const {
    createAssembly,
    getAssemblies,
    deleteAssembly,
    updateAssembly,
} = require("../controllers/AssemblyController");

const validate = require("../middlewares/handleValidation");
const { assemblyValidation } = require("../middlewares/assemblyValidation");
const authGuard = require("../middlewares/authGuard");

router.post("/assemblies", upload.single("imagePath"), assemblyValidation(), validate, createAssembly);
router.get("/admin/assemblies", getAssemblies);
router.delete("/admin/assemblies/:id", deleteAssembly);
router.put("/admin/assemblies/:id", upload.single("imagePath"), validate, updateAssembly);

module.exports = router;
