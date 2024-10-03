const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    sendPersonalMessage,
    getPersonalMessages,
    deletePersonalMessage,
} = require("../controllers/PersonalChatController");
const authGuard = require("../middlewares/authGuard");
const { validateMessage, checkValidationErrors } = require("../middlewares/personalChatValidaition");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/personal");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

router.post("/personal-chat", authGuard, upload.single("image"), validateMessage, checkValidationErrors, sendPersonalMessage);

router.get("/personal-chat/:userId", authGuard, getPersonalMessages);

router.delete("/personal-chat/:id", authGuard, deletePersonalMessage);

module.exports = router;