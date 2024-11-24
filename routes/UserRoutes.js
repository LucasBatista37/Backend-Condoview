const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/users";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const imageUpload = multer({ storage });

const {
  register,
  login,
  getCurrentUser,
  update,
  getUserById,
  getAllUsers,
  deleteUser,
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
router.post("/admin/associate", associateUserToCondominium);

module.exports = router;