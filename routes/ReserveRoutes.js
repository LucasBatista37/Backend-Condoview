const express = require("express");
const router = express.Router();

const {
    createReserve,
    getReserves,
    getReserveById,
    updateReserve,
    deleteReserve,
    approveReserve,
} = require("../controllers/ReserveController");

const validate = require("../middlewares/handleValidation");
const { reserveValidation } = require("../middlewares/reserveValidation");
const authGuard = require("../middlewares/authGuard");
const adminGuard = require("../middlewares/adminGuard");

router.post("/reserve", authGuard, reserveValidation(), validate, createReserve);
router.put("/reserve/:id", authGuard, validate, updateReserve); 

router.get("/admin/reserve", authGuard, getReserves); 
router.get("/admin/reserve/:id", authGuard, getReserveById); 
router.delete("/admin/reserve/:id", authGuard, adminGuard, deleteReserve); 
router.post("/admin/reserve/approve/:id", authGuard, adminGuard, approveReserve); 

module.exports = router;
