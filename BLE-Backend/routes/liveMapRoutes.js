const express = require("express");
const router = express.Router();
const liveMapController = require("../controllers/liveMapController");

// GET /api/live-map
router.get("/", liveMapController.getLiveMapData);

module.exports = router;
