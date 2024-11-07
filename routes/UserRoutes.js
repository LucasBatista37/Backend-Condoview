const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getCurrentUser,
  update,
  getUserById,
} = require("../controllers/UserController");
const {
  associateUserToCondominium,
} = require("../controllers/AssociateUserToCondominium");

const validate = require("../middlewares/handleValidation");
const {
  userCreateValidation,
  loginValidation,
  userUpdateValidation,
} = require("../middlewares/userValidation");
const authGuard = require("../middlewares/authGuard");
const { imageUpload } = require("../middlewares/imageUpload");

router.post("/register", userCreateValidation(), validate, register);
router.post("/login", loginValidation(), validate, login);
router.get("/profile", authGuard, getCurrentUser);
router.put(
  "/update",
  authGuard,
  userUpdateValidation(),
  validate,
  imageUpload.single("profileImage"),
  update
);
router.get("/:id", getUserById);
router.post("/admin/associate", authGuard, associateUserToCondominium);

module.exports = router;
