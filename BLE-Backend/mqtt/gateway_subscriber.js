/*
//Before triangulation & socket.io modification
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mqtt = require("mqtt");
const mongoose = require("mongoose");

// Import models
const BLE = require("../models/Ble");
const Gateway = require("../models/Gateway");
const LocationLog = require("../models/LocationLog");
const Map = require("../models/Map");

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(" MongoDB connection error:", err));

// --- Connect to MQTT Broker ---
const client = mqtt.connect(process.env.MQTT_BROKER);

client.on("connect", () => {
  console.log(" Connected to MQTT broker");
  client.subscribe("warehouse/+/beacons", err => {
  if (err) console.error(" Subscription error:", err);
  else console.log(`📡 Subscribed to topic: warehouse/+/beacons`);
  });
});

const lastLogs = new Map();

// --- MQTT Message Handler ---
client.on("message", async (topic, message) => {
  try {
    const parts = topic.split("/");
    const gatewayMac = parts[1]; // Example: "warehouse/<gatewayMac>/beacons"
    const mqttTopic = topic;

    console.log(` Topic detected for Gateway: ${gatewayMac}`);

    const payload = JSON.parse(message.toString());
    console.log(" Received data:", payload);

    const { bleMac, uuid, major, minor, rssi } = payload;

    if (!bleMac || !gatewayMac) {
      console.warn(" Missing BLE or Gateway MAC in payload, skipping...");
      return;
    }

    // --- SMART LOGGING (avoid duplicates) ---
    const key = bleMac;
    const last = lastLogs.get(key);

    if (last) {
      const sameGateway = last.gatewayMac === gatewayMac;
      const rssiDiff = Math.abs(last.rssi - rssi);
      if (sameGateway && rssiDiff < 5) {
        console.log(` Skipping duplicate log for ${bleMac} (RSSI change < 5dB)`);
        return;
      }
    }

    lastLogs.set(key, { gatewayMac, rssi });

    // --- BLE SECTION ---
    let ble = await BLE.findOne({ bleId: bleMac });
    if (!ble) {
      console.log(` BLE not registered (${bleMac}), saving new record...`);
      ble = new BLE({
        bleId: bleMac.trim(),
        uuid: uuid || "unknown",
        major: Number(major) || 0,
        minor: Number(minor) || 0,
        type: "tag",
        status: "active"
      });
      await ble.save();
      console.log(" BLE saved:", ble.bleId);
    } else {
      console.log(` BLE recognized (${bleMac})`);
    }

    // --- GATEWAY SECTION ---
    let gateway = await Gateway.findOne({ macAddress: gatewayMac });
    const now = new Date();

    if (!gateway) {
      console.log(` Gateway not registered (${gatewayMac}), saving new record...`);

      const activeMap = await Map.findOne({ active: true });
      gateway = new Gateway({
        macAddress: gatewayMac,
        mqttTopic,
        location: { x: 50, y: 50, zone: "Unassigned" },
        status: "online",
        lastSeen: now,  
         map: activeMap ? activeMap._id : null,
      });
      await gateway.save();
      console.log(` New Gateway saved: ${gatewayMac}(map: ${activeMap ? activeMap.name : "none"})`);
    } else {
      gateway.lastSeen = now;
      gateway.status = "online";
      gateway.mqttTopic = mqttTopic;
      await gateway.save();
      console.log(` Gateway updated: ${gatewayMac}`);
    }

    // --- LOCATION LOG SECTION ---
    const newLog = new LocationLog({
      bleId: ble._id,
      gatewayId: gateway._id,
      rssi,
      timestamp: now
    });

    await newLog.save();
    console.log(" Location log saved:", newLog._id);

    lastLogs.set(bleMac, { gatewayMac, rssi, timestamp: Date.now() });

  } catch (error) {
    console.error(" Error processing MQTT message:", error.message);
  }
});

// --- Periodic Cache & Status Maintenance ---
setInterval(async () => {
  lastLogs.clear();
  console.log("🧹 Cleared BLE cache");

  // Mark gateways offline if no updates in 2 minutes
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  await Gateway.updateMany({ lastSeen: { $lt: cutoff } }, { status: "offline" });
  console.log("📡 Updated inactive gateways to offline");
}, 60 * 1000);

*/
// mqtt/gateway_subscriber.js
/*
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mqtt = require("mqtt");
const mongoose = require("mongoose");
const LiveMapBroadcaster = require("../utils/liveMapBroadcaster");

// Try to import the io instance exported by server.js (may be undefined if server not started yet).
const { io } = require("../server");

// Models
const BLE = require("../models/Ble");
const Gateway = require("../models/Gateway");
const LocationLog = require("../models/LocationLog");
const Map = require("../models/Map");

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .catch(err => console.error("❌ MongoDB connection error:", err));

mongoose.connection.once("open", () => {
  console.log("📦 MongoDB connected:", mongoose.connection.name);
});

// --- MQTT Connection ---
const client = mqtt.connect(process.env.MQTT_BROKER);

client.on("connect", () => {
  console.log("📡 Connected to MQTT broker");
  client.subscribe("warehouse/+/beacons", err => {
    if (err) console.error("Subscription error:", err);
    else console.log("📡 Subscribed to warehouse/+/beacons");
  });
});

client.on("error", (err) => {
  console.error("MQTT error:", err);
});

// --- lastLogs cache (use `let` so we can reassign a fresh Map safely) ---
let lastLogs = new Map();

// --- Helper: send full live-map snapshot to sockets ---
async function emitLiveMapSnapshot() {
  try {
    const activeMap = await Map.findOne({ active: true });
    if (!activeMap) {
      if (io) io.emit("live-map-update", { map: null, gateways: [], employees: [], assets: [] });
      return;
    }

    // Find gateways assigned to the map OR gateways that are unassigned (so they still show)
    const rawGateways = await Gateway.find({
      $or: [
        { map: activeMap._id },
        { map: null }           // include unassigned gateways
      ]
    }).lean();

    const gateways = rawGateways.map(gw => ({
      id: gw._id.toString(),
      name: gw.name || "",
      macAddress: gw.macAddress || "",
      x: gw.location?.x ?? 0,
      y: gw.location?.y ?? 0,
      status: gw.lastSeen && (Date.now() - new Date(gw.lastSeen).getTime()) / 1000 > 30 ? "offline" : "online",
    }));

    const bles = await BLE.find({ status: "active" }).populate("employeeId").populate("assetId");
    const employees = [];
    const assets = [];

    for (const ble of bles) {
      const latestLog = await LocationLog.findOne({ bleId: ble._id }).sort({ timestamp: -1 }).populate("gatewayId").lean();
      if (!latestLog || !latestLog.gatewayId) continue;

      // store gateway name too so frontend can show currentGateway
      const gatewayName = latestLog.gatewayId.name || "";

      if (ble.employeeId) {
        employees.push({
          id: ble.employeeId._id.toString(),
          name: ble.employeeId.fullName,
          bleId: ble._id.toString(),
          gatewayId: latestLog.gatewayId._id.toString(),
          currentGateway: gatewayName,        // <--- added
          x: latestLog.gatewayId.location?.x ?? 0,
          y: latestLog.gatewayId.location?.y ?? 0,
          lastSeen: latestLog.timestamp
        });
      }

      if (ble.assetId) {
        assets.push({
          id: ble.assetId._id.toString(),
          name: ble.assetId.assetName,
          bleId: ble._id.toString(),
          gatewayId: latestLog.gatewayId._id.toString(),
          currentGateway: gatewayName,        // <--- added (optional/helpful)
          x: latestLog.gatewayId.location?.x ?? 0,
          y: latestLog.gatewayId.location?.y ?? 0,
          lastSeen: latestLog.timestamp
        });
      }
    }

    if (io) {
      io.emit("live-map-update", { map: activeMap, gateways, employees, assets });
      console.log("📡 Emitted live-map-update (gateways", gateways.length, "employees", employees.length, "assets", assets.length, ")");
    } else {
      console.log("📡 Prepared live-map-update (io not available). Gateways:", gateways.length, "Employees:", employees.length);
    }
  } catch (err) {
    console.error("Error emitting live map snapshot:", err);
  }
}


// --- MQTT message handler ---
client.on("message", async (topic, message) => {
  try {
    const parts = topic.split("/");
    const gatewayMac = parts[1]; // warehouse/<gatewayMac>/beacons
    const payloadRaw = message.toString();

    // quick log of raw payload for debugging (comment out if too noisy)
    // console.log("[MQTT] topic:", topic, "payload:", payloadRaw);

    let payload;
    try {
      payload = JSON.parse(payloadRaw);
    } catch (e) {
      console.warn("[MQTT] invalid JSON payload, skipping:", payloadRaw);
      return;
    }

    const { bleMac, uuid, major, minor, rssi } = payload;
    if (!bleMac || !gatewayMac) {
      console.warn("[MQTT] missing bleMac or gatewayMac:", { bleMac, gatewayMac });
      return;
    }

    // --- Smart logging / duplicate skip: small RSSI jitter ignored ---
    const last = lastLogs.get(bleMac);
    if (last && last.gatewayMac === gatewayMac && Math.abs((last.rssi || 0) - rssi) < 5) {
      // tiny RSSI changes on same gateway -> skip writing too often
      // (keeps DB from filling with near-duplicate logs)
      return;
    }
    lastLogs.set(bleMac, { gatewayMac, rssi });

    // --- BLE record (create if not exists) ---
    let ble = await BLE.findOne({ bleId: bleMac });
    if (!ble) {
      ble = await BLE.create({
        bleId: bleMac.trim(),
        uuid: uuid || "unknown",
        major: Number(major) || 0,
        minor: Number(minor) || 0,
        type: "tag",
        status: "active"
      });
      console.log("[MQTT] New BLE saved:", ble.bleId);
    } else {
      // optional: update uuid/major/minor if changed (commented to avoid extra writes)
      // await BLE.updateOne({ _id: ble._id }, { uuid, major, minor }).catch(()=>{});
    }

    // --- Gateway record (create or update lastSeen/status) ---
    const activeMap = await Map.findOne({ active: true });
    const now = new Date();
    let gateway = await Gateway.findOne({ macAddress: gatewayMac });

    if (!gateway) {
      gateway = await Gateway.create({
        macAddress: gatewayMac,
        mqttTopic: topic,
        location: { x: 50, y: 50, zone: "Unassigned" },
        status: "online",
        lastSeen: now,
        map: activeMap ? activeMap._id : null,
      });
      console.log("[MQTT] New Gateway saved:", gatewayMac);
    } else {
      gateway.lastSeen = now;
      gateway.status = "online";
      gateway.mqttTopic = topic;
      await gateway.save();
      // console.log("[MQTT] Gateway updated lastSeen:", gatewayMac);
    }

    // --- Save location log ---
    await LocationLog.create({
      bleId: ble._id,
      gatewayId: gateway._id,
      rssi,
      timestamp: now
    });
    // console.log("[MQTT] Location log saved for", ble.bleId, "via", gateway.macAddress);

    // update lastLogs entry with timestamp
    lastLogs.set(bleMac, { gatewayMac, rssi, timestamp: Date.now() });

    // --- Emit updated live-map snapshot to sockets (debounced in periodic emitter too) ---
    // We do not emit on every single MQTT message to avoid flooding; instead we schedule periodic emits.
    // But we can emit immediately on important events (optional). Here we will let periodic emitter handle it.
  } catch (err) {
    console.error("Error processing MQTT message:", err);
  }
});

// --- Send initial snapshot after DB + MQTT ready, then periodic emits ---
// Wait a short moment for DB to be ready
setTimeout(() => {
  emitLiveMapSnapshot();
  // emit every 5 seconds (adjust as needed)
  setInterval(emitLiveMapSnapshot, 5000);
}, 1200);

// --- Periodic maintenance: clear lastLogs and mark inactive gateways offline ---
setInterval(async () => {
  try {
    // reassign a fresh Map to avoid `.clear` errors if lastLogs was changed unexpectedly
    lastLogs = new Map();
    console.log("🧹 Cleared BLE cache");

    const cutoff = new Date(Date.now() - 2 * 60 * 1000);
    await Gateway.updateMany({ lastSeen: { $lt: cutoff } }, { status: "offline" });
    console.log("📡 Updated inactive gateways to offline");
  } catch (err) {
    console.error("Error in periodic maintenance:", err);
  }
}, 60 * 1000);

// --- graceful shutdown ---
process.on("SIGINT", () => {
  console.log("Shutting down subscriber...");
  try { client.end(); } catch (e) {}
  try { mongoose.disconnect(); } catch (e) {}
  process.exit(0);
});
*/