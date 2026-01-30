/*with triangulation + socket.io (error in time increment in cold exposure)
// src/components/livemap/LiveMap.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";

/**
 * LiveMap (socket.io)
 * - Fully server-driven for BLE triangulation, cold exposure, and gateway info
 */
/*
export default function LiveMap() {
  const [mapData, setMapData] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);

  const offsetCache = useRef({});
  const gwGridCache = useRef({});

  // helper for visual offsets (same as before)
  function generateGridPositions(n, cols = 3, spacingPx = 28, rowSpacingPx = 28, baseDistance = 40) {
    const rows = Math.ceil(n / cols);
    const positions = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const centerOffsetX = ((cols - 1) / 2) * spacingPx;
      const centerOffsetY = ((rows - 1) / 2) * rowSpacingPx;
      positions.push({ x: col * spacingPx - centerOffsetX, y: baseDistance + row * rowSpacingPx - centerOffsetY });
    }
    return positions;
  }

  const normalizeGateways = (rawList = []) => rawList.map(gw => ({
    id: gw.id ?? gw._id ?? String(Math.random()),
    name: gw.name ?? "",
    macAddress: gw.macAddress ?? "",
    x: Number(gw.x ?? 0),
    y: Number(gw.y ?? 0),
    status: gw.status ?? "offline",
  }));

  const allocateOffsets = (items) => {
    const grouped = {};
    items.forEach(e => {
      const gid = e.currentGateway ?? "nogw";
      if (!grouped[gid]) grouped[gid] = [];
      grouped[gid].push(e);
    });

    Object.entries(grouped).forEach(([gwId, list]) => {
      const count = list.length;
      if (!gwGridCache.current[gwId] || gwGridCache.current[gwId].length < count) {
        const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
        gwGridCache.current[gwId] = generateGridPositions(count, cols, 28, 28, 40);
      }
      list.forEach((item, idx) => {
        if (!offsetCache.current[item.id]) {
          const pos = gwGridCache.current[gwId][idx] || { x: 0, y: 40 };
          const jitterX = (Math.random() - 0.5) * 6;
          const jitterY = (Math.random() - 0.5) * 6;
          offsetCache.current[item.id] = { x: pos.x + jitterX, y: pos.y + jitterY };
        }
      });
    });
  };

  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("connect", () => console.log("🟢 Connected to backend:", socket.id));

    socket.on("active-map", map => setMapData(map));
    socket.on("active-map-updated", map => setMapData(map));

    socket.on("live-map-update", data => {
      setGateways(normalizeGateways(data.gateways));
      allocateOffsets(data.employees);
      setEmployees(data.employees);
      setAssets(data.assets);
      if (data.map) setMapData(data.map);
    });

    socket.on("disconnect", reason => console.log("⚠️ Socket disconnected:", reason));

    return () => { socket.disconnect(); };
  }, []);

  if (!mapData) return <div className="text-center mt-10 text-gray-500">Loading live map…</div>;

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Live Map</h2>
        <Link to="/full-livemap" target="_blank" rel="noopener noreferrer"
          className="text-sm bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-3 py-1 rounded hover:opacity-90">
          View Full Map
        </Link>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* MAP /}
        <div className="relative w-full h-[65vh] overflow-hidden border-2 border-slate-700 rounded-xl box-border">
          {mapData.imageUrl ? (
            <img src={`http://localhost:3000${mapData.imageUrl}`} alt={mapData.name}
              className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              No map image uploaded
            </div>
          )}

          {/* GATEWAYS /}
          {gateways.map(gw => (
            <div key={gw.id} className="absolute" style={{ left: `${gw.x}%`, top: `${gw.y}%`, transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
              <div className={`w-5 h-5 border border-white ${gw.status === "online" ? "bg-green-500" : "bg-gray-400"}`} style={{ transform: "rotate(45deg)" }}
                title={gw.name || gw.macAddress} />
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-black bg-white/80 px-1 rounded">{gw.name}</div>
            </div>
          ))}

          {/* EMPLOYEES /}
          {employees.map(emp => {
            const baseX = emp.x ?? 0;
            const baseY = emp.y ?? 0;
            const offset = offsetCache.current[emp.id] || { x: 0, y: 0 };
            const left = `calc(${baseX}% + ${offset.x}px)`;
            const top = `calc(${baseY}% + ${offset.y}px)`;

            return (
              <div key={emp.id} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
                <div className={`w-5 h-5 rounded-full border-2 ${emp.inDanger ? "bg-red-500" : "bg-green-500"}`}
                  title={`${emp.name} (${emp.currentGateway})`} />
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-black bg-white/80 px-1 rounded">{emp.name}</div>
              </div>
            );
          })}

          {/* ASSETS /}
          {assets.map(a => {
            const baseX = a.x ?? 0;
            const baseY = a.y ?? 0;
            const offset = offsetCache.current[a.id] || { x: 10, y: 10 };
            const left = `calc(${baseX}% + ${offset.x}px)`;
            const top = `calc(${baseY}% + ${offset.y}px)`;

            return (
              <div key={a.id} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
                <div className="w-4 h-4 rounded-sm border-2 bg-yellow-400" title={a.name} />
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs bg-white/80 px-1 rounded">{a.name}</div>
              </div>
            );
          })}
        </div>

        {/* TABLE /}
        <div className="w-[380px] bg-white rounded-lg shadow border border-slate-200 flex flex-col">
          <h3 className="font-semibold text-slate-700 px-3 py-2 border-b border-slate-300">Cold Exposure</h3>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm text-slate-600">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-300">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Gateway</th>
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? employees.map(emp => (
                  <tr key={emp.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-3">{emp.name}</td>
                    <td className="py-2 px-3">{emp.currentGateway}</td>
                    <td className="py-2 px-3">{Math.floor(emp.durationMinutes)} mins</td>
                    <td className="py-2 px-3">
                      {emp.inDanger ? (
                        <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded">Danger</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">OK</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-slate-400">No employees detected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
*/
/*socket.io +triangulation (fixed time in table)
// src/components/livemap/LiveMap.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";

/*
 * LiveMap (socket.io)
 * - Fully server-driven for BLE triangulation, cold exposure, and gateway info

export default function LiveMap() {
  const [mapData, setMapData] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);

  const offsetCache = useRef({});
  const gwGridCache = useRef({});

  // helper for visual offsets (same as before)
  function generateGridPositions(n, cols = 3, spacingPx = 28, rowSpacingPx = 28, baseDistance = 40) {
    const rows = Math.ceil(n / cols);
    const positions = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const centerOffsetX = ((cols - 1) / 2) * spacingPx;
      const centerOffsetY = ((rows - 1) / 2) * rowSpacingPx;
      positions.push({ x: col * spacingPx - centerOffsetX, y: baseDistance + row * rowSpacingPx - centerOffsetY });
    }
    return positions;
  }

  const normalizeGateways = (rawList = []) => rawList.map(gw => ({
    id: gw.id ?? gw._id ?? String(Math.random()),
    name: gw.name ?? "",
    macAddress: gw.macAddress ?? "",
    x: Number(gw.x ?? 0),
    y: Number(gw.y ?? 0),
    status: gw.status ?? "offline",
  }));

  const allocateOffsets = (items) => {
    const grouped = {};
    items.forEach(e => {
      const gid = e.currentGateway ?? "nogw";
      if (!grouped[gid]) grouped[gid] = [];
      grouped[gid].push(e);
    });

    Object.entries(grouped).forEach(([gwId, list]) => {
      const count = list.length;
      if (!gwGridCache.current[gwId] || gwGridCache.current[gwId].length < count) {
        const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
        gwGridCache.current[gwId] = generateGridPositions(count, cols, 28, 28, 40);
      }
      list.forEach((item, idx) => {
        if (!offsetCache.current[item.id]) {
          const pos = gwGridCache.current[gwId][idx] || { x: 0, y: 40 };
          const jitterX = (Math.random() - 0.5) * 6;
          const jitterY = (Math.random() - 0.5) * 6;
          offsetCache.current[item.id] = { x: pos.x + jitterX, y: pos.y + jitterY };
        }
      });
    });
  };

  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("connect", () => console.log("🟢 Connected to backend:", socket.id));

    socket.on("active-map", map => setMapData(map));
    socket.on("active-map-updated", map => setMapData(map));

    socket.on("live-map-update", data => {
      setGateways(normalizeGateways(data.gateways));
      allocateOffsets(data.employees);
      setEmployees(data.employees);
      setAssets(data.assets);
      if (data.map) setMapData(data.map);
    });

    socket.on("disconnect", reason => console.log("⚠️ Socket disconnected:", reason));

    return () => { socket.disconnect(); };
  }, []);

  if (!mapData) return <div className="text-center mt-10 text-gray-500">Loading live map…</div>;

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Live Map</h2>
        <Link to="/full-livemap" target="_blank" rel="noopener noreferrer"
          className="text-sm bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-3 py-1 rounded hover:opacity-90">
          View Full Map
        </Link>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* MAP /}
        <div className="relative w-full h-[65vh] overflow-hidden border-2 border-slate-700 rounded-xl box-border">
          {mapData.imageUrl ? (
            <img src={`http://localhost:3000${mapData.imageUrl}`} alt={mapData.name}
              className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              No map image uploaded
            </div>
          )}

          {/* GATEWAYS /}
          {gateways.map(gw => (
            <div key={gw.id} className="absolute" style={{ left: `${gw.x}%`, top: `${gw.y}%`, transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
              <div className={`w-5 h-5 border border-white ${gw.status === "online" ? "bg-green-500" : "bg-gray-400"}`} style={{ transform: "rotate(45deg)" }}
                title={gw.name || gw.macAddress} />
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-black bg-white/80 px-1 rounded">{gw.name}</div>
            </div>
          ))}

          {/* EMPLOYEES /}
          {employees.map(emp => {
            const baseX = emp.x ?? 0;
            const baseY = emp.y ?? 0;
            const offset = offsetCache.current[emp.id] || { x: 0, y: 0 };
            const left = `calc(${baseX}% + ${offset.x}px)`;
            const top = `calc(${baseY}% + ${offset.y}px)`;

            return (
              <div key={emp.id} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
                <div className={`w-5 h-5 rounded-full border-2 ${emp.inDanger ? "bg-red-500" : "bg-green-500"}`}
                  title={`${emp.name} (${emp.currentGateway})`} />
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-black bg-white/80 px-1 rounded">{emp.name}</div>
              </div>
            );
          })}

          {/* ASSETS /}
          {assets.map(a => {
            const baseX = a.x ?? 0;
            const baseY = a.y ?? 0;
            const offset = offsetCache.current[a.id] || { x: 10, y: 10 };
            const left = `calc(${baseX}% + ${offset.x}px)`;
            const top = `calc(${baseY}% + ${offset.y}px)`;

            return (
              <div key={a.id} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
                <div className="w-4 h-4 rounded-sm border-2 bg-yellow-400" title={a.name} />
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs bg-white/80 px-1 rounded">{a.name}</div>
              </div>
            );
          })}
        </div>

        {/* TABLE /}
        <div className="w-[380px] bg-white rounded-lg shadow border border-slate-200 flex flex-col">
          <h3 className="font-semibold text-slate-700 px-3 py-2 border-b border-slate-300">Cold Exposure</h3>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm text-slate-600">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-300">
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Gateway</th>
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? employees.map(emp => (
                  <tr key={emp.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2 px-3">{emp.name}</td>
                    <td className="py-2 px-3">{emp.currentGateway}</td>
                    <td className="py-2 px-3">{Math.floor(emp.durationMinutes)} mins</td>
                    <td className="py-2 px-3">
                      {emp.inDanger ? (
                        <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded">Danger</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">OK</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-slate-400">No employees detected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
      {/* LEGEND /}
<div className="mt-4 bg-white rounded-lg shadow p-3 text-sm text-slate-700 border border-slate-200">
  <h3 className="font-semibold mb-2">Legend</h3>

  <div className="flex flex-wrap gap-6">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-green-500" />
      <span>Employee (Normal)</span>
    </div>

    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-red-500" />
      <span>Employee (Over Cold Threshold)</span>
    </div>

    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-green-500 rotate-45" />
      <span>Gateway (Online)</span>
    </div>

    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-gray-400 rotate-45" />
      <span>Gateway (Offline)</span>
    </div>

    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-sm bg-yellow-400" />
      <span>Asset / Forklift</span>
    </div>
  </div>
</div>

    </div>
  );
}
*/

// src/components/livemap/LiveMap.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import MapImage from "../maps/MapImage";


/*
 * LiveMap (socket.io)
 * - Shows gateways, employees, assets
 * - Renders zone overlays (rectangles) and a compact zone counters table below Cold Exposure
 */

export default function LiveMap() {
  const [mapData, setMapData] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [zones, setZones] = useState([]); // expects array of { zoneId, zoneName, employeeCount, assetCount, x, y, width, height }

  const offsetCache = useRef({});
  const gwGridCache = useRef({});

  // helper for visual offsets (same as before)
  function generateGridPositions(n, cols = 3, spacingPx = 28, rowSpacingPx = 28, baseDistance = 40) {
    const rows = Math.ceil(n / cols);
    const positions = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const centerOffsetX = ((cols - 1) / 2) * spacingPx;
      const centerOffsetY = ((rows - 1) / 2) * rowSpacingPx;
      positions.push({ x: col * spacingPx - centerOffsetX, y: baseDistance + row * rowSpacingPx - centerOffsetY });
    }
    return positions;
  }

  const normalizeGateways = (rawList = []) =>
    rawList.map(gw => ({
      id: gw.id ?? gw._id ?? String(Math.random()),
      name: gw.name ?? "",
      macAddress: gw.macAddress ?? "",
      x: Number(gw.x ?? 0),
      y: Number(gw.y ?? 0),
      status: gw.status ?? "offline",
    }));

  const allocateOffsets = (items) => {
    const grouped = {};
    items.forEach(e => {
      const gid = e.currentGateway ?? "nogw";
      if (!grouped[gid]) grouped[gid] = [];
      grouped[gid].push(e);
    });

    Object.entries(grouped).forEach(([gwId, list]) => {
      const count = list.length;
      if (!gwGridCache.current[gwId] || gwGridCache.current[gwId].length < count) {
        const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
        gwGridCache.current[gwId] = generateGridPositions(count, cols, 28, 28, 40);
      }
      list.forEach((item, idx) => {
        if (!offsetCache.current[item.id]) {
          const pos = gwGridCache.current[gwId][idx] || { x: 0, y: 40 };
          const jitterX = (Math.random() - 0.5) * 6;
          const jitterY = (Math.random() - 0.5) * 6;
          offsetCache.current[item.id] = { x: pos.x + jitterX, y: pos.y + jitterY };
        }
      });
    });
  };

  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("connect", () => console.log("🟢 Connected to backend:", socket.id));

    socket.on("active-map", map => setMapData(map));
    socket.on("active-map-updated", map => setMapData(map));

    socket.on("live-map-update", data => {
      setGateways(normalizeGateways(data.gateways));
      allocateOffsets(data.employees);
      setEmployees(data.employees || []);
      setAssets(data.assets || []);
      // if server supplies zones (with coords & counts) use them
      if (Array.isArray(data.zones)) {
        setZones(data.zones);
      } else {
        // fallback: build small summary from employee currentZoneName (best-effort)
        const fallback = [];
        const zonemap = {};
        (data.employees || []).forEach(emp => {
          const zn = emp.currentZoneName || "—";
          if (!zonemap[zn]) zonemap[zn] = { zoneName: zn, employeeCount: 0, assetCount: 0 };
          zonemap[zn].employeeCount++;
        });
        (data.assets || []).forEach(a => {
          const zn = a.currentZoneName || "—";
          if (!zonemap[zn]) zonemap[zn] = { zoneName: zn, employeeCount: 0, assetCount: 0 };
          zonemap[zn].assetCount++;
        });
        for (const k of Object.keys(zonemap)) fallback.push(zonemap[k]);
        setZones(fallback);
      }

      if (data.map) setMapData(data.map);
    });

    socket.on("disconnect", reason => console.log("⚠️ Socket disconnected:", reason));

    return () => { socket.disconnect(); };
  }, []);

  if (!mapData) return <div className="text-center mt-10 text-gray-500">Loading live map…</div>;

  return (
    <div className="w-full h-screen flex flex-col bg-gray-100 p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Live Map</h2>
        <Link to="/full-livemap" target="_blank" rel="noopener noreferrer"
          className="text-sm bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-3 py-1 rounded hover:opacity-90">
          View Full Map
        </Link>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* MAP */}
        <MapImage map={mapData} className="h-[65vh] overflow-hidden border-2 border-slate-700 rounded-xl box-border">
  {/* ZONE OVERLAYS (drawn behind markers) */}
  {Array.isArray(zones) && zones.map(z => {
    if (z.x == null || z.y == null || z.width == null || z.height == null) return null;
    const style = {
      position: "absolute",
      left: `${z.x}%`,
      top: `${z.y}%`,
      width: `${z.width}%`,
      height: `${z.height}%`,
      border: "2px dashed rgba(59,130,246,0.9)",
      background: "rgba(59,130,246,0.06)",
      zIndex: 20,
      pointerEvents: "none",
    };
    const labelStyle = {
      position: "absolute",
      left: 6,
      top: 6,
      fontSize: 12,
      background: "rgba(255,255,255,0.85)",
      padding: "2px 6px",
      borderRadius: 6,
      pointerEvents: "none",
    };
    return (
      <div key={String(z.zoneId || z.zoneName)} style={style}>
        <div style={labelStyle}>{z.zoneName || z.zoneId || "Zone"}</div>
      </div>
    );
  })}

  {/* GATEWAYS */}
  {gateways.map(gw => (
    <div key={gw.id} className="absolute" style={{ left: `${gw.x}%`, top: `${gw.y}%`, transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
      <div className={`w-5 h-5 border border-white ${gw.status === "online" ? "bg-green-500" : "bg-gray-400"}`} style={{ transform: "rotate(45deg)" }}
        title={gw.name || gw.macAddress} />
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-black bg-white/80 px-1 rounded">{gw.name}</div>
    </div>
  ))}

  {/* EMPLOYEES */}
{employees.map(emp => {
  const baseX = emp.x ?? 0;
  const baseY = emp.y ?? 0;
  const offset = offsetCache.current[emp.id] || { x: 0, y: 0 };
  const left = `calc(${baseX}% + ${offset.x}px)`;
  const top = `calc(${baseY}% + ${offset.y}px)`;

  return (
    <div key={emp.id} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
      
      {/* Trespassing overlay / blinking effect */}
      {emp.isTrespassing && (
        <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-pulse z-[-1]"></div>
      )}

      {/* Employee marker */}
      <div className={`w-5 h-5 rounded-full border-2 ${emp.inDanger ? "bg-red-500" : "bg-green-500"}`}
           title={`${emp.name} (${emp.currentGateway || ""})`} />

      {/* Name label */}
      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-black bg-white/80 px-1 rounded">
        {emp.name}
      </div>
    </div>
  );
})}


  {/* ASSETS */}
  {assets.map(a => {
    const baseX = a.x ?? 0;
    const baseY = a.y ?? 0;
    const offset = offsetCache.current[a.id] || { x: 10, y: 10 };
    const left = `calc(${baseX}% + ${offset.x}px)`;
    const top = `calc(${baseY}% + ${offset.y}px)`;

    return (
      <div key={a.id} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
        <div className="w-4 h-4 rounded-sm border-2 bg-yellow-400" title={a.name} />
        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs bg-white/80 px-1 rounded">{a.name}</div>
      </div>
    );
  })}
</MapImage>


        {/* RIGHT PANEL: Cold Exposure (bigger) and Zone Counters (compact below) */}
        <div className="w-[380px] flex flex-col gap-4">
          {/* Cold Exposure Table (dominant) */}
          <div className="bg-white rounded-lg shadow border border-slate-200 flex flex-col flex-1">
            <h3 className="font-semibold text-slate-700 px-3 py-2 border-b border-slate-300">Cold Exposure</h3>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm text-slate-600">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-300">
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Gateway</th>
                    <th className="text-left py-2 px-3">Time</th>
                    <th className="text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length > 0 ? employees.map(emp => (
                    <tr key={emp.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-2 px-3">{emp.name}</td>
                      <td className="py-2 px-3">{emp.currentGateway}</td>
                      <td className="py-2 px-3">{Math.floor(emp.durationMinutes)} mins</td>
                      <td className="py-2 px-3">
                        {emp.inDanger ? (
                          <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded">Danger</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded">OK</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-slate-400">No employees detected</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zones Table (compact) */}
          <div className="bg-white rounded-lg shadow border border-slate-200">
            <h3 className="font-semibold text-slate-700 px-3 py-2 border-b border-slate-300">Zone Counters</h3>
            <div className="p-2 max-h-40 overflow-y-auto">
              <table className="w-full text-sm text-slate-600">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-300">
                    <th className="text-left py-1 px-2">R</th>
                    <th className="text-left py-1 px-2">E</th>
                    <th className="text-left py-1 px-2">A</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.length ? zones.map((z, idx) => (
                    <tr key={String(z.zoneId || z.zoneName || idx)} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-1 px-2">{z.zoneName || `Zone ${idx + 1}`}</td>
                      <td className="py-1 px-2">{z.employeeCount ?? 0}</td>
                      <td className="py-1 px-2">{z.assetCount ?? 0}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="text-center py-2 text-slate-400">No zones</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* LEGEND */}
      <div className="mt-4 bg-white rounded-lg shadow p-3 text-sm text-slate-700 border border-slate-200">
        <h3 className="font-semibold mb-2">Legend</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Employee (Normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span>Employee (Over Cold Threshold)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rotate-45" />
            <span>Gateway (Online)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rotate-45" />
            <span>Gateway (Offline)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-yellow-400" />
            <span>Asset / Forklift</span>
          </div>
        </div>
      </div>
    </div>
  );
}
