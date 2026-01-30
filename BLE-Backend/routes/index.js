const express = require("express");
const router = express.Router();

const gatewayRoutes = require("./gatewayRoutes");
const locationRoutes = require("./locationRoutes");
const mapRoutes = require("./mapRoutes"); 
const bleRoutes = require("./bleRoutes");
const employeeRoutes = require("./employeeRoutes");
const liveMapRoutes = require("./liveMapRoutes");
const assetRoutes = require("./assetRoutes");
const activityLogRoutes = require("./activityLogRoutes");
const zoneRoutes = require("./zoneRoutes");


router.use("/gateways", gatewayRoutes);
router.use("/location", locationRoutes);
router.use("/maps", mapRoutes);
router.use("/ble", bleRoutes);
router.use("/employees", employeeRoutes);
router.use("/live-map", liveMapRoutes);
router.use("/assets", assetRoutes);
router.use("/activity-log", activityLogRoutes); 
router.use("/zones", zoneRoutes);
router.use("/auth", require("./auth"));
router.use("/users", require("./users"));


module.exports = router;