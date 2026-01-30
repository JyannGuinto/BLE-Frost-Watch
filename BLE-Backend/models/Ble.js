const mongoose = require("mongoose");

const bleSchema = new mongoose.Schema({
  bleId: { type: String, required: true, unique: true },
  uuid: { type: String, required: true },
  major: { type: Number, required: true },
  minor: { type: Number, required: true },
  type: { type: String, enum: ["tag", "forklift"], required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },

  // --- NEW fields ---
  firstSeenInSession: { type: Date, default: null }, // stable session start
  lastSeen: { type: Date, default: null },           // last detection update
  currentZone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", default: null }, // optional
  currentGatewayId: { type: mongoose.Schema.Types.ObjectId, ref: "Gateway", default: null }, // optional
  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Ble", bleSchema);