const express = require("express");
const router = express.Router();

const {
    createReserve,
    getReserves,
    getReserveById,
    updateReserve,
    deleteReserve,
    approveReserve,
    rejectReserve
} = require("../controllers/ReserveController");

const validate = require("../middlewares/handleValidation");
const { reserveValidation } = require("../middlewares/reserveValidation");

router.post("/reserve", createReserve);
router.put("/reserve/:id", validate, updateReserve); 

router.get("/reserve", getReserves); 
router.get("/reserve/:id", getReserveById); 
router.delete("/reserve/:id", deleteReserve); 
router.post("/reserve/approve/:id", approveReserve); 
router.post("/reserve/reject/:id", rejectReserve);

module.exports = router;
