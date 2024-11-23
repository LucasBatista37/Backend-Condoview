const express = require("express");
const router = express.Router();

const {
  createCondominium,
  editCondominium,
  deleteCondominium,
} = require("../controllers/CondominiumController");

const validate = require("../middlewares/handleValidation");
const {
  condominiumCreateValidation,
} = require("../middlewares/condominiumValidation");

router.post(
  "/admin/create-condominium",
  condominiumCreateValidation(),
  validate,
  createCondominium
);

router.put(
  "/admin/edit-condominium/:id",
  condominiumCreateValidation(), 
  validate,
  editCondominium
);

router.delete(
  "/admin/delete-condominium/:id",
  deleteCondominium
);

module.exports = router;
