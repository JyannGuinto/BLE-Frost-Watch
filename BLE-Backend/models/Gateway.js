const mongoose = require("mongoose");

const gatewaySchema = new mongoose.Schema({
  name: {
    type: String,
    default: "", 
  },
  macAddress: {
    type: String,
    required: true,
    unique: true,
  },
  mqttTopic: {
    type: String,
    default: "", // e.g., "warehouse/<gatewayMac>/beacons"
  },
  map: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Map",
    default: null,
  },
  location: {
    zone: { type: String, default: "Unknown" },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ["online", "offline"],
    default: "offline",
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model("Gateway", gatewaySchema);