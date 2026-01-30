const mongoose = require("mongoose");

const locationLogSchema = new mongoose.Schema({
  bleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ble', required: true },
  gatewayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gateway', required: true },
  rssi: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LocationLog", locationLogSchema);