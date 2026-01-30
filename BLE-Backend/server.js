/*socket.io and weighed centroid integration(with time error)
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const Map = require('./models/Map');
const BLE = require("./models/Ble");
const Gateway = require("./models/Gateway");
const LocationLog = require("./models/LocationLog");

// Routes & Broadcaster
const routes = require("./routes");
const LiveMapBroadcaster = require("./utils/liveMapBroadcaster");

const app = express();
const server = http.createServer(app);

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});
app.set("io", io);

// --- Middleware ---
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", routes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .catch(err => console.error(" MongoDB connection error:", err));

mongoose.connection.once("open", async () => {
  console.log(" MongoDB connected:", mongoose.connection.name);

  LiveMapBroadcaster.init(io);

  // Load active map on startup
  const activeMap = await Map.findOne({ active: true }).lean();
  if (activeMap) {
    LiveMapBroadcaster.setActiveMap(activeMap);
    console.log(" Loaded active map on boot:", activeMap._id);
  } else {
    console.log(" No active map found on startup");
  }
});

// --- MQTT / BLE Handling ---
const mqtt = require("mqtt");
let lastLogs = new Map();
const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log(" Connected to MQTT broker");
  mqttClient.subscribe("warehouse/+/beacons", err => {
    if (err) console.error("Subscription error:", err);
    else console.log("📡 Subscribed to warehouse/+/beacons");
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const parts = topic.split("/");
    const gatewayMac = parts[1];
    const payload = JSON.parse(message.toString());
    const { bleMac, uuid, major, minor, rssi } = payload;
    if (!bleMac || !gatewayMac) return;

    // Smart RSSI skip
    const last = lastLogs.get(bleMac);
    if (last && last.gatewayMac === gatewayMac && Math.abs((last.rssi || 0) - rssi) < 5) return;

    lastLogs.set(bleMac, { gatewayMac, rssi, timestamp: Date.now() });

    // BLE record
    let ble = await BLE.findOne({ bleId: bleMac }) || await BLE.create({
      bleId: bleMac.trim(),
      uuid: uuid || "unknown",
      major: Number(major) || 0,
      minor: Number(minor) || 0,
      type: "tag",
      status: "active"
    });

    // Gateway record
    const now = new Date();
    const activeMap = await Map.findOne({ active: true });
    let gateway = await Gateway.findOne({ macAddress: gatewayMac });
    if (!gateway) {
      gateway = await Gateway.create({
        macAddress: gatewayMac,
        mqttTopic: topic,
        location: { x: 50, y: 50, zone: "Unassigned" },
        status: "online",
        lastSeen: now,
        map: activeMap?._id || null
      });
    } else {
      gateway.lastSeen = now;
      gateway.status = "online";
      gateway.mqttTopic = topic;
      await gateway.save();
    }

    // Save location log
    await LocationLog.create({ bleId: ble._id, gatewayId: gateway._id, rssi, timestamp: now });

  } catch (err) {
    console.error("Error processing MQTT message:", err);
  }
});

// --- Utility: Compute BLE position with weighted centroid + cold exposure ---
async function computeBlePositions(activeMap) {
  const COLD_THRESHOLD_MINUTES = 5;
  const bles = await BLE.find({ status: "active" }).populate("employeeId").populate("assetId");
  const positions = [];

  for (const ble of bles) {
    // Get recent logs from online gateways
    const logs = await LocationLog.find({ bleId: ble._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("gatewayId")
      .lean();

    const onlineLogs = logs.filter(l => l.gatewayId && l.gatewayId.status === "online");

    if (onlineLogs.length === 0) continue;

    // Find the gateway with strongest RSSI
    const strongestLog = onlineLogs.reduce((max, l) => (l.rssi > (max.rssi || -Infinity) ? l : max), {});
    const strongestGateway = strongestLog.gatewayId;

    // Weighted centroid
    let sumX = 0, sumY = 0, weightSum = 0;
    for (const log of onlineLogs) {
      if (log.rssi < -80) continue; // optional: filter weak signals
      const gw = log.gatewayId;
      const weight = Math.max(1, 100 + log.rssi); 
      sumX += (gw.location?.x ?? 0) * weight;
      sumY += (gw.location?.y ?? 0) * weight;
      weightSum += weight;
    }

    let x = sumX / weightSum;
    let y = sumY / weightSum;

    // Optional: snap to strongest gateway if dominant
    const dominantRatio = (Math.max(...onlineLogs.map(l => Math.max(1, 100 + l.rssi))) / weightSum);
    if (dominantRatio > 0.7) {
      x = strongestGateway.location?.x ?? x;
      y = strongestGateway.location?.y ?? y;
    }

    // Duration / cold exposure (from first log in this detection window)
    const firstLogTimestamp = onlineLogs[onlineLogs.length - 1].timestamp; // oldest of last 10
    const durationMinutes = (Date.now() - new Date(firstLogTimestamp).getTime()) / 60000;
    const inDanger = durationMinutes >= COLD_THRESHOLD_MINUTES;

    positions.push({
      bleId: ble._id,
      x, y,
      employeeId: ble.employeeId?._id,
      employeeName: ble.employeeId?.fullName,
      assetId: ble.assetId?._id,
      assetName: ble.assetId?.assetName,
      lastSeen: onlineLogs[0].timestamp,
      durationMinutes,
      inDanger,
      currentGateway: strongestGateway?.name || strongestGateway?.macAddress || "—",
    });
  }

  return positions;
}

// --- Emit live-map snapshot ---
async function emitLiveMapSnapshot() {
  try {
    const activeMap = await Map.findOne({ active: true }).lean();
    if (!activeMap) return;

    const rawGateways = await Gateway.find({ $or: [{ map: activeMap._id }, { map: null }] }).lean();
    const gateways = rawGateways.map(gw => ({
      id: gw._id.toString(),
      name: gw.name || "",
      macAddress: gw.macAddress || "",
      x: gw.location?.x ?? 0,
      y: gw.location?.y ?? 0,
      status: (Date.now() - new Date(gw.lastSeen).getTime()) / 1000 > 30 ? "offline" : "online"
    }));

    const blePositions = await computeBlePositions(activeMap);

    const employees = blePositions
      .filter(p => p.employeeId)
      .map(p => ({
        id: p.employeeId.toString(),
        name: p.employeeName,
        bleId: p.bleId.toString(),
        currentGateway: p.currentGateway,
        x: p.x,
        y: p.y,
        lastSeen: p.lastSeen,
        durationMinutes: p.durationMinutes,
        inDanger: p.inDanger,
      }));

    const assets = blePositions
      .filter(p => p.assetId)
      .map(p => ({
        id: p.assetId.toString(),
        name: p.assetName,
        bleId: p.bleId.toString(),
        currentGateway: p.currentGateway,
        x: p.x,
        y: p.y,
        lastSeen: p.lastSeen,
        durationMinutes: p.durationMinutes,
      }));

    LiveMapBroadcaster.broadcastLiveUpdate({ map: activeMap, gateways, employees, assets });

  } catch (err) {
    console.error("Error emitting live map snapshot:", err);
  }
}

// --- Initial + periodic emit ---
setTimeout(() => { 
  emitLiveMapSnapshot(); 
  setInterval(emitLiveMapSnapshot, 1000); // every 1 second
}, 1000);

// --- Periodic maintenance ---
setInterval(async () => {
  lastLogs = new Map();
  console.log(" Cleared BLE cache");

  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  await Gateway.updateMany({ lastSeen: { $lt: cutoff } }, { status: "offline" });
  console.log("📡 Updated inactive gateways to offline");
}, 60 * 1000);

// --- Base Route ---
app.get("/", (req, res) => {
  res.send("Server running with MongoDB + Socket.IO");
});

// --- Socket Logging ---
io.on("connection", (socket) => {
  console.log(` Socket connected: ${socket.id}`);
  LiveMapBroadcaster.sendActiveMapTo(socket);
  socket.on("disconnect", () => {
    console.log(` Socket disconnected: ${socket.id}`);
  });
});

// --- Start Server ---
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(` Server listening on port ${PORT}`));
}

module.exports = { app, io, server };
*/
/*socket.io+triangulation BEFORE ZONE IMPLEMENTATION
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const Map = require('./models/Map');
const BLE = require("./models/Ble");
const Gateway = require("./models/Gateway");
const LocationLog = require("./models/LocationLog");

// Routes & Broadcaster
const routes = require("./routes");
const LiveMapBroadcaster = require("./utils/liveMapBroadcaster");

const app = express();
const server = http.createServer(app);

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});
app.set("io", io);

// --- Middleware ---
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", routes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .catch(err => console.error(" MongoDB connection error:", err));

mongoose.connection.once("open", async () => {
  console.log(" MongoDB connected:", mongoose.connection.name);

  LiveMapBroadcaster.init(io);

  // Load active map on startup
  const activeMap = await Map.findOne({ active: true }).lean();
  if (activeMap) {
    LiveMapBroadcaster.setActiveMap(activeMap);
    console.log(" Loaded active map on boot:", activeMap._id);
  } else {
    console.log(" No active map found on startup");
  }
});

// --- MQTT / BLE Handling ---
const mqtt = require("mqtt");
let lastLogs = new Map();
const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("📡 Connected to MQTT broker");
  mqttClient.subscribe("warehouse/+/beacons", err => {
    if (err) console.error("Subscription error:", err);
    else console.log("📡 Subscribed to warehouse/+/beacons");
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const parts = topic.split("/");
    const gatewayMac = parts[1];
    const payload = JSON.parse(message.toString());
    const { bleMac, uuid, major, minor, rssi } = payload;
    if (!bleMac || !gatewayMac) return;

    // Smart RSSI skip
    const last = lastLogs.get(bleMac);
    if (last && last.gatewayMac === gatewayMac && Math.abs((last.rssi || 0) - rssi) < 5) return;

    lastLogs.set(bleMac, { gatewayMac, rssi, timestamp: Date.now() });

    // --- BLE record: create/update with session ---
    const now = new Date();
    const SESSION_GAP_MS = 60 * 1000;
    let ble = await BLE.findOne({ bleId: bleMac });

    if (!ble) {
      ble = await BLE.create({
        bleId: bleMac.trim(),
        uuid: uuid || "unknown",
        major: Number(major) || 0,
        minor: Number(minor) || 0,
        type: "tag",
        status: "active",
        lastSeen: now,
        firstSeenInSession: now
      });
    } else {
      if (!ble.lastSeen || (now.getTime() - new Date(ble.lastSeen).getTime()) > SESSION_GAP_MS) {
        ble.firstSeenInSession = now;
      }
      ble.lastSeen = now;
      ble.status = "active";
      await ble.save();
    }

    // --- Gateway record ---
    const activeMap = await Map.findOne({ active: true });
    let gateway = await Gateway.findOne({ macAddress: gatewayMac });
    if (!gateway) {
      gateway = await Gateway.create({
        macAddress: gatewayMac,
        mqttTopic: topic,
        location: { x: 50, y: 50, zone: "Unassigned" },
        status: "online",
        lastSeen: now,
        map: activeMap?._id || null
      });
    } else {
      gateway.lastSeen = now;
      gateway.status = "online";
      gateway.mqttTopic = topic;
      await gateway.save();
    }

    // --- Save location log ---
    await LocationLog.create({ bleId: ble._id, gatewayId: gateway._id, rssi, timestamp: now });

  } catch (err) {
    console.error("Error processing MQTT message:", err);
  }
});

// --- Compute BLE positions with weighted centroid + snapping ---
async function computeBlePositions(activeMap) {
  const COLD_THRESHOLD_MINUTES = 30;
  const bles = await BLE.find({ status: "active" }).populate("employeeId").populate("assetId");
  const positions = [];

  for (const ble of bles) {
    const logs = await LocationLog.find({ bleId: ble._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("gatewayId")
      .lean();

    const onlineLogs = logs.filter(l => l.gatewayId && l.gatewayId.status === "online");
    if (onlineLogs.length === 0) continue;

    // --- Triangulation / snapping ---
    const sortedByRssi = [...onlineLogs].sort((a, b) => (b.rssi || -Infinity) - (a.rssi || -Infinity));
    const strongestLog = sortedByRssi[0];
    const secondLog = sortedByRssi[1] || null;
    const strongestGateway = strongestLog ? strongestLog.gatewayId : null;

    let sumX = 0, sumY = 0, weightSum = 0;
    const weights = sortedByRssi.map(l => Math.pow(Math.max(1, 100 + (l.rssi || -100)), 1.6));

    for (let i = 0; i < sortedByRssi.length; i++) {
      const log = sortedByRssi[i];
      if (log.rssi < -90) continue;
      const gw = log.gatewayId;
      const weight = weights[i] || 1;
      sumX += (gw.location?.x ?? 0) * weight;
      sumY += (gw.location?.y ?? 0) * weight;
      weightSum += weight;
    }

    let x = sumX / (weightSum || 1);
    let y = sumY / (weightSum || 1);

    // Dominance snap
    const strongestWeight = weights[0] || 1;
    const secondWeight = weights[1] || 0.0001;
    const dominanceRatio = strongestWeight / Math.max(secondWeight, 0.0001);
    if (dominanceRatio > 3 && strongestGateway) {
      x = strongestGateway.location?.x ?? x;
      y = strongestGateway.location?.y ?? y;
    }

    // Duration
    const sessionStart = ble.firstSeenInSession ? new Date(ble.firstSeenInSession).getTime()
      : (onlineLogs[onlineLogs.length - 1]?.timestamp ? new Date(onlineLogs[onlineLogs.length - 1].timestamp).getTime() : Date.now());
    const durationMinutes = (Date.now() - sessionStart) / 60000;
    const inDanger = durationMinutes >= COLD_THRESHOLD_MINUTES;

    positions.push({
      bleId: ble._id,
      x, y,
      employeeId: ble.employeeId?._id,
      employeeName: ble.employeeId?.fullName || ble.employeeId?.username || null,
      assetId: ble.assetId?._id,
      assetName: ble.assetId?.assetName,
      lastSeen: onlineLogs[0].timestamp,
      durationMinutes,
      inDanger,
      currentGatewayId: strongestGateway?._id?.toString() || null,
      currentGateway: strongestGateway?.name || strongestGateway?.macAddress || "—",
      currentGatewayX: strongestGateway?.location?.x ?? null,
      currentGatewayY: strongestGateway?.location?.y ?? null,
    });
  }

  return positions;
}

// --- Emit live-map snapshot ---
async function emitLiveMapSnapshot() {
  try {
    const activeMap = await Map.findOne({ active: true }).lean();
    if (!activeMap) return;

    const rawGateways = await Gateway.find({ $or: [{ map: activeMap._id }, { map: null }] }).lean();
    const gateways = rawGateways.map(gw => ({
      id: gw._id.toString(),
      name: gw.name || "",
      macAddress: gw.macAddress || "",
      x: gw.location?.x ?? 0,
      y: gw.location?.y ?? 0,
      status: (Date.now() - new Date(gw.lastSeen).getTime()) / 1000 > 30 ? "offline" : "online"
    }));

    const blePositions = await computeBlePositions(activeMap);

    const employees = blePositions
      .filter(p => p.employeeId)
      .map(p => ({
        id: p.employeeId.toString(),
        name: p.employeeName,
        bleId: p.bleId.toString(),
        currentGateway: p.currentGateway,
        x: p.x,
        y: p.y,
        lastSeen: p.lastSeen,
        durationMinutes: p.durationMinutes,
        inDanger: p.inDanger,
      }));

    const assets = blePositions
      .filter(p => p.assetId)
      .map(p => ({
        id: p.assetId.toString(),
        name: p.assetName,
        bleId: p.bleId.toString(),
        currentGateway: p.currentGateway,
        x: p.x,
        y: p.y,
        lastSeen: p.lastSeen,
        durationMinutes: p.durationMinutes,
      }));

    LiveMapBroadcaster.broadcastLiveUpdate({ map: activeMap, gateways, employees, assets });

  } catch (err) {
    console.error("Error emitting live map snapshot:", err);
  }
}

// --- Initial + periodic emit ---
setTimeout(() => { 
  emitLiveMapSnapshot(); 
  setInterval(emitLiveMapSnapshot, 1000); // every 1 second
}, 1000);

// --- Periodic maintenance ---
setInterval(async () => {
  lastLogs = new Map();
  console.log(" Cleared BLE cache");

  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  await Gateway.updateMany({ lastSeen: { $lt: cutoff } }, { status: "offline" });
  console.log(" Updated inactive gateways to offline");
}, 60 * 1000);

// --- Base Route ---
app.get("/", (req, res) => {
  res.send("Server running with MongoDB + Socket.IO");
});

// --- Socket Logging ---
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  LiveMapBroadcaster.sendActiveMapTo(socket);
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// --- Start Server ---
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(` Server listening on port ${PORT}`));
}

module.exports = { app, io, server };
*/
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const Map = require('./models/Map');
const BLE = require("./models/Ble");
const Gateway = require("./models/Gateway");
const LocationLog = require("./models/LocationLog");
const Zone = require("./models/Zone");

const routes = require("./routes");
const LiveMapBroadcaster = require("./utils/liveMapBroadcaster");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});
app.set("io", io);

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", routes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI)
  .catch(err => console.error(" MongoDB connection error:", err));

mongoose.connection.once("open", async () => {
  console.log(" MongoDB connected:", mongoose.connection.name);

  LiveMapBroadcaster.init(io);

  const activeMap = await Map.findOne({ active: true }).lean();
  if (activeMap) {
    LiveMapBroadcaster.setActiveMap(activeMap);
    console.log(" Loaded active map on boot:", activeMap._id);
  } else {
    console.log(" No active map found on startup");
  }
});

// --- MQTT / BLE Handling ---
const mqtt = require("mqtt");
let lastLogs = new Map();
const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log(" Connected to MQTT broker");
  mqttClient.subscribe("warehouse/+/beacons", err => {
    if (err) console.error("Subscription error:", err);
    else console.log(" Subscribed to warehouse/+/beacons");
  });
});

mqttClient.on("message", async (topic, message) => {
  try {
    const parts = topic.split("/");
    const gatewayMac = parts[1];
    const payload = JSON.parse(message.toString());
    const { bleMac, uuid, major, minor, rssi } = payload;
    if (!bleMac || !gatewayMac) return;

    const last = lastLogs.get(bleMac);
    if (last && last.gatewayMac === gatewayMac && Math.abs((last.rssi || 0) - rssi) < 5) return;
    lastLogs.set(bleMac, { gatewayMac, rssi, timestamp: Date.now() });

    const now = new Date();
    const SESSION_GAP_MS = 60 * 1000;
    let ble = await BLE.findOne({ bleId: bleMac });

    if (!ble) {
      ble = await BLE.create({
        bleId: bleMac.trim(),
        uuid: uuid || "unknown",
        major: Number(major) || 0,
        minor: Number(minor) || 0,
        type: "tag",
        status: "active",
        lastSeen: now,
        firstSeenInSession: now
      });
    } else {
      if (!ble.lastSeen || (now.getTime() - new Date(ble.lastSeen).getTime()) > SESSION_GAP_MS) {
        ble.firstSeenInSession = now;
      }
      ble.lastSeen = now;
      ble.status = "active";
      await ble.save();
    }

    const activeMap = await Map.findOne({ active: true });
    let gateway = await Gateway.findOne({ macAddress: gatewayMac });
    if (!gateway) {
      gateway = await Gateway.create({
        macAddress: gatewayMac,
        mqttTopic: topic,
        location: { x: 50, y: 50, zone: "Unassigned" },
        status: "online",
        lastSeen: now,
        map: activeMap?._id || null
      });
    } else {
      gateway.lastSeen = now;
      gateway.status = "online";
      gateway.mqttTopic = topic;
      await gateway.save();
    }

    await LocationLog.create({ bleId: ble._id, gatewayId: gateway._id, rssi, timestamp: now });
  } catch (err) {
    console.error("Error processing MQTT message:", err);
  }
});

// --- Compute BLE positions with trespassing ---
async function computeBlePositions(activeMap) {
  const COLD_THRESHOLD_MINUTES = 30;

  const bles = await BLE.find({ status: "active" })
    .populate("employeeId")
    .populate("assetId");

  const zones = await Zone.find({ map: activeMap._id }).lean();
  const positions = [];

  function isInsideZone(bleX, bleY, zone) {
    return (
      bleX >= zone.x &&
      bleX <= zone.x + zone.width &&
      bleY >= zone.y &&
      bleY <= zone.y + zone.height
    );
  }

  for (const ble of bles) {
    const logs = await LocationLog.find({ bleId: ble._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("gatewayId")
      .lean();

    const onlineLogs = logs.filter(l => l.gatewayId && l.gatewayId.status === "online");
    if (onlineLogs.length === 0) continue;

    const sortedByRssi = [...onlineLogs].sort((a, b) => (b.rssi || -Infinity) - (a.rssi || -Infinity));
    const strongestLog = sortedByRssi[0];
    const strongestGateway = strongestLog?.gatewayId;

    let sumX = 0, sumY = 0, weightSum = 0;
    const weights = sortedByRssi.map(l => Math.pow(Math.max(1, 100 + (l.rssi || -100)), 1.6));
    for (let i = 0; i < sortedByRssi.length; i++) {
      const log = sortedByRssi[i];
      if (log.rssi < -90) continue;
      const gw = log.gatewayId;
      const weight = weights[i] || 1;
      sumX += (gw.location?.x ?? 0) * weight;
      sumY += (gw.location?.y ?? 0) * weight;
      weightSum += weight;
    }

    let x = sumX / (weightSum || 1);
    let y = sumY / (weightSum || 1);

    const dominanceRatio = (weights[0] || 1) / (weights[1] || 0.0001);
    if (dominanceRatio > 3 && strongestGateway) {
      x = strongestGateway.location?.x ?? x;
      y = strongestGateway.location?.y ?? y;
    }

    const sessionStart = ble.firstSeenInSession ? new Date(ble.firstSeenInSession).getTime()
      : (onlineLogs[onlineLogs.length - 1]?.timestamp ? new Date(onlineLogs[onlineLogs.length - 1].timestamp).getTime() : Date.now());
    const durationMinutes = (Date.now() - sessionStart) / 60000;
    const inDanger = durationMinutes >= COLD_THRESHOLD_MINUTES;

    let currentZone = null;
    for (const zone of zones) {
      if (isInsideZone(x, y, zone)) {
        currentZone = zone;
        break;
      }
    }

    ble.currentZone = currentZone?._id || null;
    await ble.save();

    // --- TRESPASSING ---
    let isTrespassing = false;
    if (ble.employeeId) {
      const allowedZones = ble.employeeId.allowedZones || [];
      if (allowedZones.length > 0) {
        const currentZoneId = currentZone?._id?.toString() || null;
        const allowedIds = allowedZones.map(z => z.toString());
        if (!currentZoneId || !allowedIds.includes(currentZoneId)) {
          isTrespassing = true;
        }
      }
    }

    positions.push({
      bleId: ble._id,
      x, y,
      employeeId: ble.employeeId?._id,
      employeeName: ble.employeeId?.fullName || ble.employeeId?.username || null,
      assetId: ble.assetId?._id,
      assetName: ble.assetId?.assetName,
      lastSeen: onlineLogs[0].timestamp,
      durationMinutes,
      inDanger,
      currentGateway: strongestGateway?.name || strongestGateway?.macAddress || "—",
      currentGatewayId: strongestGateway?._id?.toString() || null,
      currentZone: currentZone?._id || null,
      currentZoneName: currentZone?.name || "—",
      isTrespassing
    });
  }

  return positions;
}

// --- Emit live map ---
async function emitLiveMapSnapshot() {
  try {
    const activeMap = await Map.findOne({ active: true }).lean();
    if (!activeMap) return;

    const rawGateways = await Gateway.find({ $or: [{ map: activeMap._id }, { map: null }] }).lean();
    const gateways = rawGateways.map(gw => ({
      id: gw._id.toString(),
      name: gw.name || "",
      macAddress: gw.macAddress || "",
      x: gw.location?.x ?? 0,
      y: gw.location?.y ?? 0,
      status: (Date.now() - new Date(gw.lastSeen).getTime()) / 1000 > 30 ? "offline" : "online"
    }));

    const blePositions = await computeBlePositions(activeMap);

    const employees = blePositions.filter(p => p.employeeId).map(p => ({
      id: p.employeeId.toString(),
      name: p.employeeName,
      bleId: p.bleId.toString(),
      currentGateway: p.currentGateway,
      currentZone: p.currentZone,
      currentZoneName: p.currentZoneName,
      x: p.x,
      y: p.y,
      lastSeen: p.lastSeen,
      durationMinutes: p.durationMinutes,
      inDanger: p.inDanger,
      isTrespassing: p.isTrespassing
    }));

    const assets = blePositions.filter(p => p.assetId).map(p => ({
      id: p.assetId.toString(),
      name: p.assetName,
      bleId: p.bleId.toString(),
      currentGateway: p.currentGateway,
      currentZone: p.currentZone,
      currentZoneName: p.currentZoneName,
      x: p.x,
      y: p.y,
      lastSeen: p.lastSeen,
      durationMinutes: p.durationMinutes
    }));

    const zonesList = await Zone.find({ map: activeMap._id }).lean();
    const zoneCounters = zonesList.map(z => ({
      zoneId: z._id,
      zoneName: z.name,
      employeeCount: employees.filter(e => String(e.currentZone) === String(z._id)).length,
      assetCount: assets.filter(a => String(a.currentZone) === String(z._id)).length,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height
    }));

    LiveMapBroadcaster.broadcastLiveUpdate({
      map: activeMap,
      gateways,
      employees,
      assets,
      zones: zoneCounters
    });

  } catch (err) {
    console.error("Error emitting live map snapshot:", err);
  }
}

setTimeout(() => { 
  emitLiveMapSnapshot(); 
  setInterval(emitLiveMapSnapshot, 1000);
}, 1000);

setInterval(async () => {
  lastLogs = new Map();
  console.log(" Cleared BLE cache");
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  await Gateway.updateMany({ lastSeen: { $lt: cutoff } }, { status: "offline" });
  console.log(" Updated inactive gateways to offline");
}, 60 * 1000);

app.get("/", (req, res) => {
  res.send("Server running with MongoDB + Socket.IO");
});

io.on("connection", (socket) => {
  console.log(` Socket connected: ${socket.id}`);
  LiveMapBroadcaster.sendActiveMapTo(socket);
  socket.on("disconnect", () => console.log(` Socket disconnected: ${socket.id}`));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(` Server listening on port ${PORT}`));
}

module.exports = { app, io, server };
