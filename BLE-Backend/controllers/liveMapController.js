// controllers/liveMapController.js
const Gateway = require("../models/Gateway");
const Ble = require("../models/Ble");
const MapModel = require("../models/Map");
const LocationLog = require("../models/LocationLog");

// thresholds (tweak as needed)
const COLD_THRESHOLD_MINUTES = 30;
const DETECTION_TIMEOUT_SECONDS = 30; // show BLE detected within last 30s
const GATEWAY_TIMEOUT_SECONDS = 30; // gateway considered offline after 30s without lastSeen

exports.getLiveMapData = async (req, res) => {
  try {
    const map = await MapModel.findOne({ active: true });
    if (!map) return res.status(404).json({ message: "No active map found" });

    // get gateways on this map 
    const rawGateways = await Gateway.find({ map: map._id }).lean();
    const gateways = rawGateways.map(gw => {
      const secondsSinceLastSeen = gw.lastSeen ? (Date.now() - new Date(gw.lastSeen).getTime()) / 1000 : Infinity;
      return {
        id: gw._id,
        name: gw.name || "",
        macAddress: gw.macAddress || "",
        x: gw.location?.x ?? 0,
        y: gw.location?.y ?? 0,
        zone: gw.location?.zone ?? "Unknown",
        status: secondsSinceLastSeen > GATEWAY_TIMEOUT_SECONDS ? "offline" : "online",
      };
    });

    // get active BLEs (we require BLE to be active and associated to an employee)
    const bles = await Ble.find({ status: "active", employeeId: { $ne: null } }).populate("employeeId");

    // build employee data
    const employeeData = [];

    for (const ble of bles) {
      if (!ble.employeeId) continue;

      // latest few logs for this BLE
      const latestLogs = await LocationLog.find({ bleId: ble._id })
        .sort({ timestamp: -1 })
        .limit(5)
        .populate("gatewayId")
        .lean();

      if (!latestLogs.length) continue;

      const lastSeen = latestLogs[0].timestamp;
      const secondsSinceLastSeen = (Date.now() - new Date(lastSeen).getTime()) / 1000;
      if (secondsSinceLastSeen > DETECTION_TIMEOUT_SECONDS) {
        // not recent enough -> skip showing on live map
        continue;
      }

      // pick strongest RSSI among fetched logs
      const strongest = latestLogs.reduce((best, cur) => (cur.rssi > (best?.rssi ?? -999) ? cur : best), latestLogs[0]);
      if (!strongest.gatewayId) continue;
      const gateway = strongest.gatewayId;

      // compute sensible "inSince" — use previous log logic to avoid counting long disconnected periods
      const recentWindowMinutes = 40;
      const previousLog = await LocationLog.findOne({
        bleId: ble._id,
        timestamp: { $lt: strongest.timestamp }
      }).sort({ timestamp: -1 }).lean();

      const now = new Date();
      let inSince;
      if (!previousLog || (now - new Date(previousLog.timestamp)) / 60000 > recentWindowMinutes) {
        inSince = strongest.timestamp;
      } else {
        inSince = previousLog.timestamp;
      }

      const durationMinutes = Math.floor((Date.now() - new Date(inSince).getTime()) / 60000);
      const inDanger = durationMinutes > COLD_THRESHOLD_MINUTES;

      employeeData.push({
        id: ble.employeeId._id.toString(),
        name: ble.employeeId.fullName || "—",
        bleId: ble._id.toString(),
        bleTag: ble.bleId,
        currentGateway: gateway.name || "",
        gatewayId: gateway._id.toString(),
        x: gateway.location?.x ?? 0,
        y: gateway.location?.y ?? 0,
        durationMinutes,
        inDanger,
        inSince,
        lastSeen,
      });
    }

    return res.json({
      map: {
        id: map._id.toString(),
        name: map.name,
        imageUrl: map.imageUrl,
        width: map.width ?? 0,
        height: map.height ?? 0,
      },
      gateways,
      employees: employeeData
    });
  } catch (err) {
    console.error("Error generating live map data:", err);
    res.status(500).json({ message: "Error generating live map data", error: err.message });
  }
};
