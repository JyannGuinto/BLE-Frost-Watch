const express = require("express");
const router = express.Router();
const bleController = require("../controllers/bleController");

router.post("/", bleController.createBle);
router.get("/", bleController.getBles);
router.get("/unassigned", bleController.getUnassignedBles);
router.get("/:id", bleController.getBleById);
router.put("/:id", bleController.updateBle);
router.delete("/:id", bleController.deleteBle);

module.exports = router;