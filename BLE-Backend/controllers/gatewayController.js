// controllers/gatewayController.js
const Gateway = require("../models/Gateway");

//  Create new gateway
exports.createGateway = async (req, res) => {
  try {
    const { name, macAddress, location, mapId } = req.body;

    const existing = await Gateway.findOne({ macAddress });
    if (existing) return res.status(400).json({ message: "Gateway already exists" });

    // If no mapId provided, assign the most recent map
    let assignedMap = null;
    if (!mapId) {
      const Map = require("../models/Map");
      const latestMap = await Map.findOne().sort({ createdAt: -1 });
      if (latestMap) assignedMap = latestMap._id;
    }

    const newGateway = new Gateway({
      name,
      macAddress,
      location: {
        x: location?.x ?? 50,
        y: location?.y ?? 50,
        zone: location?.zone || "Unassigned",
      },
      map: mapId || assignedMap, //  attach a map
      lastSeen: new Date(),
    });

    await newGateway.save();
    res.status(201).json(newGateway);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

 //Get all gateways
exports.getGateways = async (req, res) => { 
  try {
    const gateways = await Gateway.find().sort({ createdAt: -1 });
    res.json(gateways);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* for pagination
exports.getGateways = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { macAddress: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } }
      ];
    }

    const total = await Gateway.countDocuments(query);

    const gateways = await Gateway.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .populate('map');

    res.json({
      data: gateways,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });

  } catch (err) {
    console.error("Error fetching gateways:", err);
    res.status(500).json({ message: "Failed to fetch gateways" });
  }
};
*/

//  Update gateway info
exports.updateGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Gateway.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Gateway not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete gateway
exports.deleteGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Gateway.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Gateway not found" });
    res.json({ message: "Gateway deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update only position (x/y) on the gateway's location or top-level fields
exports.updatePosition = async (req, res) => {
  try {
    const { x, y, mapId } = req.body;
    // if your schema uses location.x/y:
    const updated = await Gateway.findByIdAndUpdate(
      req.params.id,
      {
        ...(x !== undefined ? { "location.x": x } : {}),
        ...(y !== undefined ? { "location.y": y } : {}),
        ...(mapId ? { map: mapId } : {}),
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Gateway not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating gateway position:", err);
    res.status(500).json({ message: "Server error" });
  }
};
