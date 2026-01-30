const Ble = require("../models/Ble");
const Employee = require("../models/Employee");
const Asset = require("../models/Asset");
const { assignBle, unassignBle } = require("../utils/bleAssignment");

// CREATE BLE
exports.createBle = async (req, res) => {
  try {
    const { bleId, uuid, major, minor, type, employeeId, assetId, status } = req.body;

    const existing = await Ble.findOne({ bleId });
    if (existing)
      return res.status(400).json({ message: "BLE ID already exists" });

    const ble = new Ble({
      bleId,
      uuid,
      major,
      minor,
      type,
      employeeId: employeeId || null,
      assetId: assetId || null,
      status: status || "active",
    });

    await ble.save();

    // assign to employee or asset if provided
    if (employeeId) await assignBle(ble._id, "employee", employeeId);
    if (assetId) await assignBle(ble._id, "asset", assetId);

    const populated = await Ble.findById(ble._id)
      .populate("employeeId", "fullName department position")
      .populate("assetId", "assetName type description");

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating BLE:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  GET ALL BLEs (with search + pagination)
exports.getBles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const safePage = Math.max(1, parseInt(page));
    const safeLimit = Math.max(1, parseInt(limit));

    let filter = {};
if (search && search.trim() !== "") {
  const num = Number(search);

  filter = {
    $or: [
      { bleId: { $regex: search, $options: "i" } },
      { uuid: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
      ...(Number.isInteger(num)
        ? [{ major: num }, { minor: num }]
        : []),
    ],
  };
}

    const total = await Ble.countDocuments(filter);

    const bles = await Ble.find(filter)
      .populate("employeeId", "fullName department")
      .populate("assetId", "assetName")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit);

    res.json({
      bles,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
      total,
    });
  } catch (error) {
    console.error("Error fetching BLEs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET BLE BY ID
exports.getBleById = async (req, res) => {
  try {
    const ble = await Ble.findById(req.params.id)
      .populate("employeeId", "fullName department position")
      .populate("assetId", "assetName type description");

    if (!ble) return res.status(404).json({ message: "BLE not found" });

    res.json(ble);
  } catch (error) {
    console.error("Error fetching BLE:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE BLE
exports.updateBle = async (req, res) => {
  try {
    const ble = await Ble.findById(req.params.id);
    if (!ble) return res.status(404).json({ message: "BLE not found" });

    let { employeeId, assetId, bleId, uuid, major, minor, type, status } = req.body;

    // Normalize empty strings to null
    employeeId = employeeId || null;
    assetId = assetId || null;

    // Convert IDs to strings for reliable comparison
    const currentEmpId = ble.employeeId ? ble.employeeId.toString() : null;
    const currentAssetId = ble.assetId ? ble.assetId.toString() : null;

    // --- HANDLE EMPLOYEE SYNC ---
    if (currentEmpId !== employeeId) {
      // Clear old employee assignment
      if (ble.employeeId) {
        await Employee.findByIdAndUpdate(ble.employeeId, { bleTag: null });
      }
      // Assign new employee if provided
      if (employeeId) {
        const emp = await Employee.findById(employeeId);
        if (emp.bleTag) {
          return res.status(400).json({
            message: `Employee ${emp.fullName} already has a BLE assigned`,
          });
        }
        await Employee.findByIdAndUpdate(employeeId, { bleTag: ble._id });
      }
      ble.employeeId = employeeId;
    }

    // --- HANDLE ASSET SYNC ---
    if (currentAssetId !== assetId) {
      // Clear old asset assignment
      if (ble.assetId) {
        await Asset.findByIdAndUpdate(ble.assetId, { bleBeacon: null });
      }
      // Assign new asset if provided
      if (assetId) {
        const asset = await Asset.findById(assetId);
        if (asset.bleBeacon) {
          return res.status(400).json({
            message: `Asset ${asset.assetName} already has a BLE assigned`,
          });
        }
        await Asset.findByIdAndUpdate(assetId, { bleBeacon: ble._id });
      }
      ble.assetId = assetId;
    }

    // --- UPDATE OTHER BLE FIELDS ---
    ble.bleId = bleId ?? ble.bleId;
    ble.uuid = uuid ?? ble.uuid;
    ble.major = major ?? ble.major;
    ble.minor = minor ?? ble.minor;
    ble.type = type ?? ble.type;
    ble.status = status ?? ble.status;

    await ble.save();

    // Return populated BLE
    const populated = await Ble.findById(ble._id)
      .populate("employeeId", "fullName department")
      .populate("assetId", "assetName");

    res.json(populated);
  } catch (err) {
    console.error("Error updating BLE:", err);
    res.status(500).json({ message: "Error updating BLE", error: err.message });
  }
};

// DELETE BLE
exports.deleteBle = async (req, res) => {
  try {
    const ble = await Ble.findById(req.params.id);
    if (!ble) return res.status(404).json({ message: "BLE not found" });

    if (ble.employeeId) await unassignBle(ble._id, "employee");
    if (ble.assetId) await unassignBle(ble._id, "asset");

    await Ble.findByIdAndDelete(req.params.id);

    res.json({ message: "BLE deleted successfully" });
  } catch (error) {
    console.error("Error deleting BLE:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET UNASSIGNED BLEs (neither employee nor asset)
exports.getUnassignedBles = async (req, res) => {
  try {
    const bles = await Ble.find({ employeeId: null, assetId: null });
    res.json(bles);
  } catch (error) {
    console.error("Error fetching unassigned BLEs:", error);
    res.status(500).json({ message: "Error fetching unassigned BLEs" });
  }
};
