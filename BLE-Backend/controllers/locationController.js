const LocationLog = require("../models/LocationLog");

exports.getLatestLocation = async (req, res) => {
  try {
    const latestLog = await LocationLog.findOne()
      .sort({ timestamp: -1 })
      .populate("bleId gatewayId");

    if (!latestLog) return res.status(404).json({ message: "No logs found" });

    const data = {
      bleMac: latestLog.bleId?.bleId,
      gatewayMac: latestLog.gatewayId?.macAddress,
      rssi: latestLog.rssi,
      timestamp: latestLog.timestamp
    };

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
