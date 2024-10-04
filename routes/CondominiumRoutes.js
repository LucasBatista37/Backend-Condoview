// routes/CondominiumRoutes.js
const express = require("express");
const router = express.Router();

const { createCondominium } = require("../controllers/CondominiumController");

const validate = require("../middlewares/handleValidation");
const authGuard = require("../middlewares/authGuard");
const { condominiumCreateValidation } = require("../middlewares/condominiumValidation");

router.post("/create-condominium", authGuard, condominiumCreateValidation(), validate, createCondominium);

module.exports = router;
