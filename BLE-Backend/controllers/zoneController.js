const Zone = require("../models/Zone");
const Map = require("../models/Map");

exports.createZone = async (req, res) => {
  try {
    const z = await Zone.create(req.body);
    res.status(201).json(z);
  } catch (err) {
    res.status(500).json({ message: "Failed to create zone", error: err.message });
  }
};

exports.getZones = async (req, res) => {
  try {
    const { mapId } = req.query;
    const zones = mapId
      ? await Zone.find({ map: mapId })
      : await Zone.find();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch zones" });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const updated = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update zone" });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    await Zone.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete zone" });
  }
};
