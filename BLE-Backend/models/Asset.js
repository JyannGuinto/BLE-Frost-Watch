const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema({
  assetName: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  bleBeacon: { type: mongoose.Schema.Types.ObjectId, ref: "Ble", default: null,required: false }
}, { timestamps: true });

module.exports = mongoose.model("Asset", assetSchema);