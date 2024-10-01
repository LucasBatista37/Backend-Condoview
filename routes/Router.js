const express = require("express");
const router = express();

router.use("/api/users", require("./UserRoutes"));
router.use("/api/users", require("./ReserveRoutes"));
router.use("/api/users", require("./MaintenanceRoutes"));
router.use("/api/users", require("./OccurrenceRoutes"));

router.get("/", (req, res) => {
    res.send("API Working!");
})

module.exports = router;