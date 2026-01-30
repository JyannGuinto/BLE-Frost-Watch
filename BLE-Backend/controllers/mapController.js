// controllers/mapController.js
const Map = require("../models/Map");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sizeOf = require("image-size").default || require("image-size");
const LiveMapBroadcaster = require("../utils/liveMapBroadcaster");
const sharp = require("sharp");

// ensure upload folder exists
const UPLOAD_DIR = path.join(__dirname, "../uploads/maps");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const name = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /png|jpe?g|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.test(ext)) return cb(new Error("Only images allowed"));
    cb(null, true);
  }
});

// Upload Map
exports.uploadMap = [
  upload.single("mapImage"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const imageUrl = `/uploads/maps/${req.file.filename}`;
      const { name } = req.body;

      let width = 0, height = 0;
      try {
        // Use sharp to get metadata
        const metadata = await sharp(req.file.path).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;
        console.log("Image dimensions:", width, height);
      } catch (err) {
        console.warn("Could not get image size:", err.message);
      }

      const newMap = new Map({
        name: name || req.file.originalname,
        imageUrl,
        width,
        height,
        active: false
      });

      await newMap.save();
      res.status(201).json(newMap);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to upload map", error: err.message });
    }
  }
];
// Get All Maps
exports.getMaps = async (req, res) => {
  try {
    const maps = await Map.find().sort({ createdAt: -1 });
    res.json(maps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch maps" });
  }
};

// Delete Map
exports.deleteMap = async (req, res) => {
  try {
    const { id } = req.params;
    const map = await Map.findByIdAndDelete(id);
    if (!map) return res.status(404).json({ message: "Map not found" });

    const fullPath = path.join(__dirname, "..", map.imageUrl);
    fs.unlink(fullPath, (err) => {
      if (err) console.warn("Could not delete file:", err.message);
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete map" });
  }
};

// Set Active Map (new)
exports.setActiveMap = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Deactivate all maps
    await Map.updateMany({}, { $set: { active: false } });

    // 2. Activate the selected map
    const activeMap = await Map.findByIdAndUpdate(
      id,
      { active: true },
      { new: true }
    );

    if (!activeMap) {
      return res.status(404).json({ message: "Map not found" });
    }

    // 3. Update stored cached map
    LiveMapBroadcaster.setActiveMap(activeMap);

    // 4. Broadcast proper active map change to all clients
    LiveMapBroadcaster.broadcastActiveMap(activeMap);

    res.json(activeMap);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to set active map" });
  }
};
//added for socket.io
// Get Active Map (for socket.io init)
exports.getActiveMap = async (req, res) => {
  try {
    const map = await Map.findOne({ active: true });

    if (!map) {
      LiveMapBroadcaster.setActiveMap(null);
      return res.json(null);
    }

    LiveMapBroadcaster.setActiveMap(map);
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get active map" });
  }
};
