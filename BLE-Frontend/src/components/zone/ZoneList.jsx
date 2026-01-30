import React, { useEffect, useState } from "react";
import api from "../../services/api";
import ZoneMapEditor from "./ZoneMapEditor";

export default function ZoneList() {
  const [zones, setZones] = useState([]);
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMapManager, setShowMapManager] = useState(false);

  useEffect(() => {
    fetchMaps();
    fetchZones();
  }, []);

  useEffect(() => {
    if (selectedMap) fetchZones(selectedMap._id);
  }, [selectedMap]);

  async function fetchMaps() {
    try {
      const res = await api.get("/api/maps");
      const arr = Array.isArray(res) ? res : [];
      setMaps(arr);
      const activeMap = arr.find((m) => m.active) || arr[0] || null;
      setSelectedMap(activeMap);
    } catch (err) {
      console.error("Failed to fetch maps:", err);
      setMaps([]);
      setSelectedMap(null);
    }
  }

  async function fetchZones(mapId) {
    try {
      const url = mapId ? `/api/zones?mapId=${mapId}` : "/api/zones";
      const res = await api.get(url);
      const arr = Array.isArray(res) ? res : [];
      setZones(arr);
    } catch (err) {
      console.error("Failed to fetch zones:", err);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetActiveMap(id) {
    try {
      await api.patch(`/api/maps/setActive/${id}`);
      await fetchMaps();
      alert("Active map updated");
    } catch (err) {
      console.error("Failed to set active map:", err);
      alert("Failed to set active map");
    }
  }

  if (loading) return <div>Loading zones...</div>;

  return (
    <div className="bg-white/80 rounded-2xl shadow p-8">
      {/* Header + Map Dropdown + Manage Zones Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-slate-600 font-semibold">Zones</h2>
        <div className="flex gap-2 items-center">
          <select
            value={selectedMap?._id || ""}
            onChange={(e) => {
              const m = maps.find((mm) => mm._id === e.target.value);
              setSelectedMap(m || null);
            }}
            className="border border-slate-300 rounded px-2 py-2 h-[38px]"
          >
            <option value="">{maps.length ? "Select map..." : "No maps uploaded"}</option>
            {maps.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name} {m.active ? "(Active)" : ""}
              </option>
            ))}
          </select>

          {selectedMap && !selectedMap.active && (
            <button
              onClick={() => handleSetActiveMap(selectedMap._id)}
              className="ml-3 bg-gradient-to-r from-green-400 to-green-500 text-white px-3 py-1 rounded h-[38px]"
            >
              Set Active
            </button>
          )}

          <button
            onClick={() => setShowMapManager(true)}
            className="bg-gradient-to-r from-green-400 to-green-500 text-white px-4 py-2 rounded h-[38px]"
          >
            Manage Zones
          </button>
        </div>
      </div>

      {/* Zones Table */}
      <table className="w-full text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Map</th>
            <th className="text-left py-2">Type</th>
            <th className="text-left py-2">Coords (x,y,w,h)</th>
          </tr>
        </thead>
        <tbody>
          {zones.length > 0 ? (
            zones.map((z) => (
              <tr key={z._id} className="border-b border-slate-200">
                <td className="py-2 text-slate-600">{z.name}</td>
                <td className="py-2 text-slate-600">
  {(() => {
    if (!z.map) return selectedMap?.name || "-";
    // If z.map is an object with name, use it
    if (typeof z.map === "object" && z.map.name) return z.map.name;
    // If z.map is just an ID, find the map in maps state
    const mapObj = maps.find((m) => m._id === z.map);
    return mapObj ? mapObj.name : z.map;
  })()}
</td>
                <td className="py-2 text-slate-600">{z.type}</td>
                <td className="py-2 text-slate-600">
                  {`${Math.round(z.x)}, ${Math.round(z.y)}, ${Math.round(z.width)}, ${Math.round(z.height)}`}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">
                No zones found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Map Manager Modal */}
      {showMapManager && selectedMap && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-3/4 h-[80vh] relative p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Map & Zones Manager</h3>

            <div className="flex-grow border-2 border-slate-300 rounded-xl overflow-auto flex items-center justify-center bg-slate-50">
              <ZoneMapEditor
                map={selectedMap}
                zones={zones.filter(
                  (z) => String(z.map) === String(selectedMap._id) || (z.map && z.map._id === selectedMap._id)
                )}
                onZonesChanged={() => fetchZones(selectedMap._id)}
              />
            </div>

            <button
              onClick={() => setShowMapManager(false)}
              className="absolute top-3 right-4 text-slate-600 hover:text-slate-900 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
