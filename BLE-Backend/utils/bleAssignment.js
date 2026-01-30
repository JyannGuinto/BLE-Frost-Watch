const Ble = require("../models/Ble");
const Employee = require("../models/Employee");
const Asset = require("../models/Asset");

// Assign BLE to employee or asset (exclusively)
exports.assignBle = async (bleId, type, targetId) => {
  const ble = await Ble.findById(bleId);
  if (!ble) throw new Error("BLE not found");

  // If BLE is already assigned, unassign first
  if (ble.employeeId || ble.assetId) {
    await exports.unassignBle(bleId);
  }

  if (type === "employee") {
    const employee = await Employee.findById(targetId);
    if (!employee) throw new Error("Employee not found");

    // If employee already has a BLE, unassign it
    if (employee.bleTag) {
      await exports.unassignBle(employee.bleTag);
    }

    // Link both sides
    ble.employeeId = employee._id;
    ble.assetId = null;
    await ble.save();

    employee.bleTag = ble._id;
    await employee.save();
  }

  else if (type === "asset") {
    const asset = await Asset.findById(targetId);
    if (!asset) throw new Error("Asset not found");

    // If asset already has a BLE, unassign it
    if (asset.bleBeacon) {
      await exports.unassignBle(asset.bleBeacon);
    }

    // Link both sides
    ble.assetId = asset._id;
    ble.employeeId = null;
    await ble.save();

    asset.bleBeacon = ble._id;
    await asset.save();
  }

  return ble;
};

// Unassign BLE from whoever owns it
// utils/bleAssignment.js
exports.unassignBle = async (bleId) => {
  const ble = await Ble.findById(bleId);
  if (!ble) throw new Error("BLE not found");

  if (ble.employeeId) {
    // Make sure bleTag on employee is cleared
    await Employee.findByIdAndUpdate(ble.employeeId, { bleTag: null });
  }
  if (ble.assetId) {
    await Asset.findByIdAndUpdate(ble.assetId, { bleBeacon: null });
  }

  ble.employeeId = null;
  ble.assetId = null;
  await ble.save();

  return ble;
};
