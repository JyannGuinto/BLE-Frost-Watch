const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const Ble = require("../models/Ble");
const { assignBle, unassignBle } = require("../utils/bleAssignment");

// CREATE Asset
exports.createAsset = async (req, res) => {
  try {
    const { assetName, status, bleBeacon } = req.body;

    if (!assetName) {
      return res.status(400).json({ message: "Asset name is required" });
    }

    const asset = new Asset({
      assetName,
      status: status || "active",
      bleBeacon: bleBeacon || null,
    });

    await asset.save();

    if (bleBeacon) await assignBle(bleBeacon, "asset", asset._id);

    const populated = await Asset.findById(asset._id)
      .populate("bleBeacon", "bleId uuid type status macAddress");
    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating asset:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};


// GET all assets (with pagination + search)
exports.getAssets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const filter = search
      ? {
          assetName: { $regex: search, $options: "i" },
        }
      : {};

    const total = await Asset.countDocuments(filter);

    const assets = await Asset.find(filter)
      .populate("bleBeacon", "bleId uuid type status macAddress")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      assets,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (err) {
    console.error("Error fetching assets:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAssetsForDropdown = async (req, res) => {
  try {
    const assets = await Asset.find()
      .select("assetName bleBeacon");
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// GET single asset
exports.getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate("bleBeacon", "bleId uuid type status macAddress");
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  } catch (err) {
    console.error("Error fetching asset:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE asset
exports.updateAsset = async (req, res) => {
  try {
    let { bleBeacon } = req.body;

    if (bleBeacon && typeof bleBeacon === "object" && bleBeacon._id) {
      bleBeacon = bleBeacon._id;
    }
    if (bleBeacon === "") bleBeacon = null;

    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

    // Handle BLE unassignment or reassignment
    if (bleBeacon === null && asset.bleBeacon) {
      await unassignBle(asset.bleBeacon, "asset");
      asset.bleBeacon = null;
    } else if (
      bleBeacon &&
      (!asset.bleBeacon || bleBeacon.toString() !== asset.bleBeacon.toString())
    ) {
      // Unassign old BLE
if (asset.bleBeacon) {
  await unassignBle(asset.bleBeacon);
}

// Assign new BLE
await assignBle(bleBeacon, "asset", asset._id);
asset.bleBeacon = bleBeacon;
    }

    Object.assign(asset, req.body);
    await asset.save();

    const populated = await Asset.findById(asset._id)
      .populate("bleBeacon", "bleId uuid type status macAddress");
    res.json(populated);
  } catch (err) {
    console.error("Error updating asset:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// DELETE asset
exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });

   if (asset.bleBeacon) {
  await unassignBle(asset.bleBeacon);
}

    res.json({ message: "Asset deleted successfully" });
  } catch (err) {
    console.error("Error deleting asset:", err);
    res.status(500).json({ message: "Server error" });
  }
};
