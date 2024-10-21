const express = require("express");
const multer = require("multer");
const router = express.Router();

const { sendMessage, getMessages, deleteMessage } = require("../controllers/ChatController");
const validate = require("../middlewares/handleValidation");
const { chatValidation } = require("../middlewares/chatValidation");

// Configuração do armazenamento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/chat");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Tipo de arquivo não suportado"), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5, 
    },
    fileFilter: fileFilter,
});

router.post(
    "/chat",
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "file", maxCount: 1 },
    ]),
    chatValidation(),
    validate,
    sendMessage
);

router.get("/admin/chat", getMessages); 

router.delete("/chat/:id", deleteMessage); 

module.exports = router;
