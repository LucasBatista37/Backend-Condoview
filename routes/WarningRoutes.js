const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/warning");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const {
  createNotice,
  getNotices,
  deleteNotice,
  updateNotice,
} = require("../controllers/WarningController");

const validate = require("../middlewares/handleValidation");
const { noticeValidation } = require("../middlewares/warningValidation");
const authGuard = require("../middlewares/authGuard");
const adminGuard = require("../middlewares/adminGuard");

router.post("/admin/notices", upload.single("imagePath"), noticeValidation(), validate, createNotice);
router.delete("/admin/notices/:id", deleteNotice);
router.put("/admin/notices/:id", upload.single("imagePath"), validate, updateNotice);

router.get("/admin/notices", getNotices);


module.exports = router;
