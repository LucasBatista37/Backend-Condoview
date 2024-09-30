const express = require("express");
const router = express.Router();

const {
    createMaintenance,
    getMaintenances,
    deleteMaintenance,
    approveMaintenance,
    rejectMaintenance,
    updateMaintenance, 
} = require("../controllers/MaintenanceController");

const validate = require("../middlewares/handleValidation");
const { maintenanceValidation } = require("../middlewares/maintenanceValidation");
const authGuard = require("../middlewares/authGuard");
const adminGuard = require("../middlewares/adminGuard"); 

router.post("/maintenance/register", authGuard, maintenanceValidation(), validate, createMaintenance); 
router.get("/maintenance", authGuard, getMaintenances);   

router.delete("/maintenance/:id", authGuard, adminGuard, deleteMaintenance); 
router.post("/maintenance/approve/:id", authGuard, adminGuard, approveMaintenance); 
router.post("/maintenance/reject/:id", authGuard, adminGuard, rejectMaintenance); 
router.put("/maintenance/:id", authGuard, adminGuard, validate, updateMaintenance);

module.exports = router;
