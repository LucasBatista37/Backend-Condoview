const express = require("express");
const router = express.Router();

const {
  createReserve,
  getReserves,
  deleteReserve,
  approveReserve,
  rejectReserve,
  updateReserve,
} = require("../controllers/ReserveController");

router.post("/reserve", createReserve);
router.get("/admin/reserve", getReserves);
router.delete("/admin/reserve/:id", deleteReserve);
router.post("/admin/reserve/approve/:id", approveReserve);
router.post("/admin/reserve/reject/:id", rejectReserve);
router.put("/admin/reserve/:id", updateReserve);

module.exports = router;