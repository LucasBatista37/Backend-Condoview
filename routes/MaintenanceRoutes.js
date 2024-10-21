const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/maintenance");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

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
const adminGuard = require("../middlewares/adminGuard");

router.post("/maintenance", upload.single("imagePath"), maintenanceValidation(), validate, createMaintenance);
router.get("/admin/maintenance", getMaintenances);

router.delete("/admin/maintenance/:id" , deleteMaintenance);
router.post("/admin/maintenance/approve/:id", approveMaintenance);
router.post("/admin/maintenance/reject/:id", rejectMaintenance);
router.put("/admin/maintenance/:id", upload.single("imagePath"), validate, updateMaintenance);

module.exports = router;
