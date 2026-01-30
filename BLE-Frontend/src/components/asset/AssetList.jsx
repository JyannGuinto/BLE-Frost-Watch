import React, { useEffect, useState } from "react";
import api from "../../services/api";

export default function AssetList() {
  const [assets, setAssets] = useState([]);
  const [bleList, setBleList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editAsset, setEditAsset] = useState(null);

  const [newAsset, setNewAsset] = useState({
    assetName: "",
    status: "active",
    bleBeacon: "",
  });

  async function loadAssets() {
    setLoading(true);
    try {
      const res = await api.get(
        `/api/assets?page=${page}&limit=10&search=${encodeURIComponent(search)}`
      );

      setAssets(Array.isArray(res.assets) ? res.assets : []);
      setPages(res.pages || 1);
    } catch (err) {
      console.error("Error fetching assets:", err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }
  const loadAssetsForDropdown = async () => {
  try {
    const res = await api.get("/api/assets/dropdown"); // create this route
    setAssets(res.data || []); // plain array
  } catch (err) {
    console.error("Error fetching assets for dropdown:", err);
    setAssets([]);
  }
};

  async function loadBles() {
    try {
      const list = await api.get("/api/ble/unassigned");
      setBleList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading BLE list:", err);
      setBleList([]);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    loadBles();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/api/assets", newAsset);
      setShowAddModal(false);
      setNewAsset({ assetName: "", status: "active", bleBeacon: "" });
      await Promise.all([loadAssets(), loadBles()]);
    } catch (err) {
      alert("Failed to create asset");
    } finally {
      setCreating(false);
    }
  }

  function handleEdit(asset) {
    setEditAsset({ ...asset });
    setShowEditModal(true);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    const payload = { ...editAsset };

    if (payload.bleBeacon && payload.bleBeacon._id) {
      payload.bleBeacon = payload.bleBeacon._id;
    }
    if (payload.bleBeacon === "") payload.bleBeacon = null;

    try {
      await api.put(`/api/assets/${editAsset._id}`, payload);
      setShowEditModal(false);
      await Promise.all([loadAssets(), loadBles()]);
    } catch (err) {
      alert("Failed to update asset");
    }
  }
  const renderPagination = () => {
  if (pages <= 1) return null;

  const pagesToShow = 5;
  let start = Math.max(1, page - Math.floor(pagesToShow / 2));
  let end = Math.min(pages, start + pagesToShow - 1);

  if (end - start < pagesToShow - 1) {
    start = Math.max(1, end - pagesToShow + 1);
  }

  const pageNumbers = [];
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="flex justify-end gap-2 mt-6 items-center">
      <button
        disabled={page === 1}
        onClick={() => setPage(1)}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        {"<<"}
      </button>

      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        Prev
      </button>

      {pageNumbers.map((p) => (
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`px-3 py-1 rounded ${
            p === page
              ? "bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        disabled={page === pages}
        onClick={() => setPage(page + 1)}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        Next
      </button>

      <button
        disabled={page === pages}
        onClick={() => setPage(pages)}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        {">>"}
      </button>
    </div>
  );
};


  if (loading) return <div>Loading assets...</div>;

  return (
    <div className="bg-white/80 rounded-2xl shadow p-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-slate-600 font-semibold">Assets</h2>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-[#2fc2e7]"
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-2 rounded"
          >
            Add Asset
          </button>
        </div>
      </div>

      <table className="w-full text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">BLE Tag</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.length ? (
            assets.map((a) => (
              <tr key={a._id} className="border-b border-slate-200">
                <td className="py-2">{a.assetName}</td>
                <td className="py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      a.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="py-2">{a.bleBeacon?.bleId || "—"}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleEdit(a)}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">
                No assets found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      
      {renderPagination()}




      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center ">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Add Asset</h3>
            </div>
            <form onSubmit={handleCreate}>
              <div className="px-6 py-4 space-y-3">
                <input
                  type="text"
                  placeholder="Asset Name"
                  className="border border-slate-300 rounded-lg p-2 w-full"
                  value={newAsset.assetName}
                  onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                />
              </div>
              <div className="px-6 py-3 border-t border-slate-300 flex justify-end gap-2">
                <button onClick={() => setShowAddModal(false)} type="button" className="bg-gray-300 px-3 py-1 rounded">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-1 rounded">
                  {creating ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editAsset && (
        <div className="fixed inset-0 flex items-center justify-center ">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Edit Asset</h3>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="px-6 py-4 space-y-3">
                <input
                  type="text"
                  className="border border-slate-300 rounded-lg p-2 w-full"
                  value={editAsset.assetName}
                  onChange={(e) => setEditAsset({ ...editAsset, assetName: e.target.value })}
                />
                <select
                  value={editAsset.status}
                  onChange={(e) => setEditAsset({ ...editAsset, status: e.target.value })}
                  className="border border-slate-300 rounded-lg p-2 w-full"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={editAsset.bleBeacon?._id || ""}
                  onChange={(e) => setEditAsset({ ...editAsset, bleBeacon: e.target.value || null })}
                  className="border border-slate-300 rounded-lg p-2 w-full"
                >
                  <option value="">No BLE Tag</option>
                  {editAsset.bleBeacon && (
                    <option value={editAsset.bleBeacon._id}>
                      {editAsset.bleBeacon.macAddress || editAsset.bleBeacon.bleId} (Current)
                    </option>
                  )}
                  {bleList
                    .filter((b) => b._id !== editAsset.bleBeacon?._id)
                    .map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.macAddress || b.bleId}
                      </option>
                    ))}
                </select>
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
    </div>
  );
}
