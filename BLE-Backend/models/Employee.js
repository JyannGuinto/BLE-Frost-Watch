const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  department: { type: String, default: "" },
  position: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  bleTag: { type: mongoose.Schema.Types.ObjectId, ref: "Ble", default: null,required: false },
  allowedZones: [{ type: mongoose.Schema.Types.ObjectId, ref: "Zone" }]// NEW
}, { timestamps: true });

module.exports = mongoose.model("Employee", employeeSchema);