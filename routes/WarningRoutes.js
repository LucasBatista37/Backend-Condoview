const express = require("express");
const router = express.Router();

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
const validateUserCondominium = require("../middlewares/validateUserCondominium");

router.post(
  "/admin/notices",
  authGuard,
  validateUserCondominium, 
  adminGuard, 
  noticeValidation(), 
  validate,
  createNotice 
);

router.delete(
  "/admin/notices/:id",
  authGuard,
  validateUserCondominium,
  adminGuard,
  deleteNotice
);

router.put(
  "/admin/notices/:id",
  authGuard,
  validateUserCondominium,
  adminGuard,
  validate,
  updateNotice
);

router.get(
  "/admin/notices",
  authGuard,
  validateUserCondominium,
  getNotices
);

module.exports = router;
