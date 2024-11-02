const express = require("express");
const router = express.Router();
const path = require("path");

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

router.post("/admin/notices", noticeValidation(), validate, createNotice);
router.delete("/admin/notices/:id", deleteNotice);
router.put("/admin/notices/:id", validate, updateNotice);

router.get("/admin/notices", getNotices);


module.exports = router;
