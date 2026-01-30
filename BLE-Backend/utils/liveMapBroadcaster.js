// utils/liveMapBroadcaster.js
class LiveMapBroadcaster {
  constructor() {
    this.io = null;
    this.cachedActiveMap = null;
  }

  init(io) {
    this.io = io;
    console.log(" LiveMapBroadcaster initialized");
  }

  setActiveMap(map) {
    this.cachedActiveMap = map || null;
    console.log(" Cached active map updated:", map?._id || "none");
  }

  sendActiveMapTo(socket) {
    if (!this.cachedActiveMap) {
      console.log(" No active map to send to", socket.id);
      return;
    }
    socket.emit("active-map", this.cachedActiveMap);
    console.log(` Sent active-map → ${socket.id}`);
  }

  /**
   * Broadcast a live-map-update payload.
   * Expectation for parameters:
   *  - map: map object
   *  - gateways: [{ id, name, macAddress, x, y, status }]
   *  - employees: [{ id, name, bleId, currentGateway, currentZone, currentZoneName, x, y, lastSeen, durationMinutes, inDanger }]
   *  - assets: similar to employees but for assets
   *  - zones: [{ zoneId, zoneName, employeeCount, assetCount, x, y, width, height }]
   */
  broadcastLiveUpdate({ map, gateways = [], employees = [], assets = [], zones = [] } = {}) {
    if (!this.io) {
      console.warn("LiveMapBroadcaster: no io available, skipping broadcast");
      return;
    }

    // Normalize employees & assets: ensure numeric coords and default fields
    const safeEmployees = (employees || []).map((e) => ({
      id: e.id ?? e._id ?? String(Math.random()),
      name: e.name ?? e.employeeName ?? "Unknown",
      bleId: e.bleId ?? null,
      currentGateway: e.currentGateway ?? "—",
      currentZone: e.currentZone ?? null,
      currentZoneName: e.currentZoneName ?? (e.currentZoneName === undefined ? "—" : e.currentZoneName),
      x: Number(e.x ?? 0),
      y: Number(e.y ?? 0),
      lastSeen: e.lastSeen ?? null,
      durationMinutes: Number(e.durationMinutes ?? 0),
      inDanger: Boolean(e.inDanger ?? false),
    }));

    const safeAssets = (assets || []).map((a) => ({
      id: a.id ?? a._id ?? String(Math.random()),
      name: a.name ?? a.assetName ?? "Unknown",
      bleId: a.bleId ?? null,
      currentGateway: a.currentGateway ?? "—",
      currentZone: a.currentZone ?? null,
      currentZoneName: a.currentZoneName ?? (a.currentZoneName === undefined ? "—" : a.currentZoneName),
      x: Number(a.x ?? 0),
      y: Number(a.y ?? 0),
      lastSeen: a.lastSeen ?? null,
      durationMinutes: Number(a.durationMinutes ?? 0),
    }));

    // Normalize zones: ensure numeric shape fields and counts
    const safeZones = (zones || []).map((z) => ({
      zoneId: z.zoneId ?? z._id ?? z.id ?? null,
      zoneName: z.zoneName ?? z.name ?? "Unnamed zone",
      employeeCount: Number(z.employeeCount ?? 0),
      assetCount: Number(z.assetCount ?? 0),
      x: Number(z.x ?? 0),
      y: Number(z.y ?? 0),
      width: Number(z.width ?? 0),
      height: Number(z.height ?? 0),
    }));

    const payload = {
      map: map || null,
      gateways: gateways || [],
      employees: safeEmployees,
      assets: safeAssets,
      zones: safeZones,
    };

    this.io.emit("live-map-update", payload);

    console.log(
      " Broadcast live-map-update:",
      "map", payload.map ? payload.map._id || payload.map.id || "(map)" : "(none)",
      "gateways", (gateways || []).length,
      "employees", safeEmployees.length,
      "assets", safeAssets.length,
      "zones", safeZones.length
    );
  }

  broadcastActiveMap(map) {
    if (!this.io) return;
    this.cachedActiveMap = map || null;
    this.io.emit("active-map-updated", map);
    console.log(" broadcast active-map-updated:", map?._id || "none");
  }
}

module.exports = new LiveMapBroadcaster();
