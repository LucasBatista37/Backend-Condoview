const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/users");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Arquivo não é uma imagem"), false);
  }
};

const imageUpload = multer({ storage, fileFilter });

const {
  register,
  login,
  getCurrentUser,
  update,
  getUserById,
  getAllUsers,
  deleteUser, 
  confirmEmail,
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
router.get("/admin/all", getAllUsers);
router.delete("/admin/:id", authGuard, deleteUser); 
router.get("/confirm/:token", confirmEmail);
router.post("/admin/associate", authGuard, associateUserToCondominium);


module.exports = router;
