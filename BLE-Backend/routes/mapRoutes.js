const express = require("express");
const router = express.Router();
const mapController = require("../controllers/mapController");

// Routes

router.get("/", mapController.getMaps);
router.post("/upload", mapController.uploadMap); // controller already handles multer
router.delete("/:id", mapController.deleteMap);
router.patch("/setActive/:id", mapController.setActiveMap);
router.get("/active", mapController.getActiveMap);//added for socket.io

module.exports = router;