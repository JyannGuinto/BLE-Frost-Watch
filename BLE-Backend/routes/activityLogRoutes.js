const express = require("express");
const router = express.Router();

const activityLogController = require("../controllers/activityLogController");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// GET /activity-log
router.get("/", auth, admin, activityLogController.getActivityLogs);

module.exports = router;
