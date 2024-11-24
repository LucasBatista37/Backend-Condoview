const express = require("express");
const multer = require("multer");
const router = express.Router();
const authGuard = require("../middlewares/authGuard");
const { sendMessage, getMessages, deleteMessage } = require("../controllers/ChatController");
const validate = require("../middlewares/handleValidation");
const { chatValidation } = require("../middlewares/chatValidation");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/chat"); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`); 
  },
});

const upload = multer({
  storage: storage, 
});
;

router.post(
  "/chat",
  authGuard, 
  upload.fields([
    { name: "image", maxCount: 1 }, 
    { name: "file", maxCount: 1 },  
  ]),
  chatValidation(),
  validate, 
  sendMessage 
);

router.get("/admin/chat", authGuard, getMessages);

router.delete("/chat/:id", authGuard, deleteMessage);

module.exports = router;
