const express = require("express");
const router = express.Router();
const gatewayController = require("../controllers/gatewayController");

router.patch("/:id/position", gatewayController.updatePosition);
router.post("/", gatewayController.createGateway);
router.get("/", gatewayController.getGateways);
router.put("/:id", gatewayController.updateGateway);
router.delete("/:id", gatewayController.deleteGateway);

module.exports = router;