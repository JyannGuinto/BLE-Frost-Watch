import React, { useEffect, useState } from "react";
import api from "../../services/api";
import MapImage from "../maps/MapImage";

/**
 * GatewayList + Map Manager modal (full file)
 * - fixes fetch (uses res.data)
 * - uses normalized gateway objects for rendering and dragging
 * - adds map upload + set-active map
 * - ensures map image fills the container (object-cover) so percent coords line up with LiveMap
 */

export default function GatewayList() {
  const [gateways, setGateways] = useState([]); // raw DB docs from /api/gateways
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newGateway, setNewGateway] = useState({ name: "", macAddress: "" });
  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editGateway, setEditGateway] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMapManager, setShowMapManager] = useState(false);

  // upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ensure fresh data when modal opens
  useEffect(() => {
    fetchGateways();
    fetchMaps();
  }, []);

  useEffect(() => {
    if (showMapManager) {
      // refresh maps and gateways each time modal opens
      fetchMaps();
      fetchGateways();
      console.log("Maps:", maps);
console.log("Gateways:", gateways);
    }
  }, [showMapManager]);

  // normalize gateway for use in modal (guarantee numeric coords)
  const normalizeGatewayForModal = (gw) => {
    const loc = gw.location ?? {};
    return {
      ...gw,
      _id: gw._id ?? gw.id,
      location: {
        zone: loc.zone ?? "Unknown",
        x: Number(loc.x ?? gw.x ?? 0),
        y: Number(loc.y ?? gw.y ?? 0),
      },
    };
  };

  // --- API fetchers ---
  async function fetchMaps() {
    try {
      const res = await api.get("/api/maps");
      const arr = Array.isArray(res) ? res : [];
      setMaps(arr);

      // prefer the active map; fall back to first map if present
      if (arr.length) {
        const activeMap = arr.find((m) => m.active) || arr[0];
        setSelectedMap(activeMap);
      } else {
        setSelectedMap(null);
      }
    } catch (err) {
      console.error("Failed to fetch maps:", err);
      setMaps([]);
      setSelectedMap(null);
    }
  }

  async function fetchGateways() {
    try {
      const res = await api.get("/api/gateways");
      const list = Array.isArray(res) ? res : [];
      setGateways(list);
    } catch (err) {
      console.error("Failed to fetch gateways:", err);
      setGateways([]);
    } finally {
      setLoading(false);
    }
  }

  // --- Edit / Create / Delete / Update ---
  function handleEdit(gateway) {
    setEditGateway({ ...gateway });
    setShowEditModal(true);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editGateway.name || !editGateway.macAddress) return alert("All fields required");
    try {
      await api.put(`/api/gateways/${editGateway._id}`, editGateway);
      setShowEditModal(false);
      fetchGateways();
    } catch (err) {
      console.error("Failed to update gateway:", err);
      alert("Error updating gateway");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newGateway.name || !newGateway.macAddress) return alert("Please fill out all fields.");
    setCreating(true);
    try {
      await api.post("/api/gateways", newGateway);
      setNewGateway({ name: "", macAddress: "" });
      fetchGateways();
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to create gateway:", err);
      alert("Error creating gateway");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this gateway?")) return;
    try {
      await api.delete(`/api/gateways/${id}`);
      setGateways((prev) => prev.filter((g) => g._id !== id));
    } catch (err) {
      console.error("Failed to delete gateway:", err);
      alert("Error deleting gateway");
    }
  }

  // --- Map upload + set active ---
  async function handleUploadMap(e) {
    e.preventDefault();
    if (!uploadFile) return alert("Please choose an image file first.");
    setUploading(true);
    const fd = new FormData();
    fd.append("mapImage", uploadFile);
    // optionally can add name: fd.append("name", "My map");
    try {
      await api.post("/api/maps/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadFile(null);
      await fetchMaps();
      alert("Map uploaded");
    } catch (err) {
      console.error("Map upload failed:", err);
      alert("Map upload failed");
    } finally {
      setUploading(false);
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

  // --- Drag handlers (same as before) ---
  const startDrag = (e, gw) => {
    e.preventDefault();
    const mapEl = e.currentTarget.closest(".relative");

    const moveHandler = (moveEvent) => {
      const rect = mapEl.getBoundingClientRect();
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      e.currentTarget.parentElement.style.left = `${x}%`;
      e.currentTarget.parentElement.style.top = `${y}%`;
    };

    const upHandler = async (upEvent) => {
      const rect = mapEl.getBoundingClientRect();
      const x = ((upEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((upEvent.clientY - rect.top) / rect.height) * 100;

      document.removeEventListener("mousemove", moveHandler);
      document.removeEventListener("mouseup", upHandler);

      try {
        await api.patch(`/api/gateways/${gw._id}/position`, {
          x,
          y,
          mapId: selectedMap?._id ?? null,
        });
        fetchGateways();
      } catch (err) {
        console.error("Failed to update position:", err);
        fetchGateways(); // revert visual
      }
    };

    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("mouseup", upHandler);
  };

  if (loading) return <div>Loading gateways...</div>;

  return (
    <div className="bg-white/80 rounded-2xl shadow p-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-slate-600 font-semibold">Gateways</h2>

        <div className="flex gap-2">
          <button onClick={() => setShowMapManager(true)} className="bg-gradient-to-r from-green-400 to-green-500 text-white px-4 py-2 rounded">
            Manage Map
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] px-4 py-2 rounded text-white">
            Add Gateway
          </button>
        </div>
      </div>

      <table className="w-full text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">MAC Address</th>
            
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(gateways) && gateways.length > 0 ? (
            gateways.map((gw) => (
              <tr key={gw._id} className="border-b border-slate-200">
                <td className="py-2 text-slate-600">{gw.name || "-"}</td>
                <td className="py-2 text-slate-600">{gw.macAddress}</td>
                
                
                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      gw.status === "online" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {gw.status || "Inactive"}
                  </span>
                </td>
                <td className="py-2 flex gap-2">
                  <button onClick={() => handleEdit(gw)} className=" font-medium text-blue-600 px-2 py-1 hover:underline ">
                    Edit
                  </button>
                  {/* Uncomment to enable delete */}
                  {/* <button onClick={() => handleDelete(gw._id)} className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Delete</button> */}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-4 text-gray-500">
                No gateways found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center ">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Add Gateway</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Gateway Name"
                className="border border-slate-300 rounded p-2 w-full"
                value={newGateway.name}
                onChange={(e) => setNewGateway({ ...newGateway, name: e.target.value })}
              />
              <input
                type="text"
                name="macAddress"
                placeholder="MAC Address"
                className="border border-slate-300 rounded p-2 w-full"
                value={newGateway.macAddress}
                onChange={(e) => setNewGateway({ ...newGateway, macAddress: e.target.value })}
              />
            </div>
            <div className="px-6 py-3 border-t border-slate-300 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="bg-gray-300 px-3 py-1 rounded">
                Cancel
              </button>
              <button type="submit" onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-1 rounded">
                {creating ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Edit Gateway</h3>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="px-6 py-4 space-y-3">
                <input
                  type="text"
                  name="name"
                  placeholder="Gateway Name"
                  className="border rounded p-2 w-full"
                  value={editGateway?.name || ""}
                  onChange={(e) => setEditGateway({ ...editGateway, name: e.target.value })}
                />
                <input
                  type="text"
                  name="macAddress"
                  placeholder="MAC Address"
                  className="border rounded p-2 w-full"
                  value={editGateway?.macAddress || ""}
                  onChange={(e) => setEditGateway({ ...editGateway, macAddress: e.target.value })}
                />
              </div>
              <div className="px-6 py-3 border-t border-slate-300 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="bg-gray-300 px-3 py-1 rounded">
                  Cancel
                </button>
                <button type="submit" className="bg-gradient-to-r from-green-400 to-green-500 text-white px-4 py-1 rounded">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Manager Modal */}
{showMapManager && (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
    <div className="bg-white rounded-2xl shadow-lg w-3/4 h-[80vh] relative p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Map Management</h3>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <span className="w-3 h-3 bg-green-500 rounded-full" /> Online
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <span className="w-3 h-3 bg-gray-400 rounded-full" /> Offline
        </div>

        {/* Upload form */}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="border border-slate-300 rounded px-2 py-1"
          />
          <button
            onClick={handleUploadMap}
            disabled={uploading}
            className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-3 py-1 rounded"
          >
            {uploading ? "Uploading..." : "Upload Map"}
          </button>
        </div>
      </div>

      {/* Map selector */}
      <div className="mb-3">
        <select
          value={selectedMap?._id || ""}
          onChange={(e) => {
            const m = maps.find((mm) => mm._id === e.target.value);
            setSelectedMap(m || null);
          }}
          className="border border-slate-300 rounded px-2 py-1"
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
            className="ml-3 bg-gradient-to-r from-green-400 to-green-500 text-white px-3 py-1 rounded"
          >
            Set Active
          </button>
        )}
      </div>

      {/* Map container */}
      <div className="flex-grow flex items-center justify-center overflow-auto border-2 border-slate-300 rounded-xl bg-slate-50 [&::-webkit-scrollbar]:hidden">
        {selectedMap ? (
          <MapImage map={selectedMap} className="inline-block max-h-[60vh]">
  {gateways
    .filter((gw) => !gw.map || String(gw.map) === String(selectedMap._id))
    .map((gwRaw) => {
      const gw = normalizeGatewayForModal(gwRaw);
      return (
        <div
          key={gw._id}
          className="absolute"
          style={{
            left: `${gw.location.x}%`,
            top: `${gw.location.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`rounded-full w-4 h-4 border-2 border-white cursor-grab hover:cursor-grabbing transition-transform duration-100 ${gw.status === "online" ? "bg-green-500" : "bg-gray-400"}`}
            onMouseDown={(e) => startDrag(e, gw)}
          />
          <span className="text-xs text-slate-700 mt-1 text-center select-none">
            {gw.name || gw.macAddress}
          </span>
        </div>
      );
    })}
</MapImage>

        ) : (
          <p className="text-center text-slate-500">No map uploaded yet.</p>
        )}
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
