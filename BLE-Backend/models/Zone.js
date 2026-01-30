const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  map: { type: mongoose.Schema.Types.ObjectId, ref: "Map", required: true },

  type: { type: String, enum: ["rect"], default: "rect" },

  // rectangle coordinates
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Zone", zoneSchema);
