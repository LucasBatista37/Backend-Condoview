const express = require("express");
const router = express.Router();

const { createCondominium } = require("../controllers/CondominiumController");

const validate = require("../middlewares/handleValidation");
const { condominiumCreateValidation } = require("../middlewares/condominiumValidation");

router.post("/create-condominium", condominiumCreateValidation(), validate, createCondominium);

module.exports = router;
