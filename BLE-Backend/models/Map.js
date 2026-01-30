const mongoose = require("mongoose");

const mapSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true }, // path or URL to the map image
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: false } // optionally one 'active' map for TV
});


module.exports = mongoose.model("Map", mapSchema);