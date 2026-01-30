import React, { useState, useEffect } from "react";
import api from "../../services/api";

export default function BleList() {

  const [search, setSearch] = useState("");
const [page, setPage] = useState(1);
const [pages, setPages] = useState(1);

const limit = 10;

  const [bles, setBles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBle, setSelectedBle] = useState(null);

  const [addFormData, setAddFormData] = useState({
    bleId: "",
    uuid: "",
    major: "",
    minor: "",
    type: "tag",
    status: "active",
    employeeId: "",
    assetId: "",
  });

  const [editFormData, setEditFormData] = useState({
    bleId: "",
    uuid: "",
    major: "",
    minor: "",
    type: "tag",
    status: "active",
    employeeId: "",
    assetId: "",
  });

  // Load BLEs, Employees, Assets
  useEffect(() => {
    loadBles();
    loadEmployees();
    loadAssets();
  }, []);

  const loadBles = async () => {
  try {
    const res = await api.get(
      `/api/ble?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
    );

    setBles(Array.isArray(res.bles) ? res.bles : []);
    setPages(res.pages || 1);
  } catch (error) {
    console.error("Error fetching BLE list:", error);
    setBles([]);
  }
};
useEffect(() => {
  loadBles();
}, [page, search]);

useEffect(() => {
  setPage(1);
}, [search]);

 const loadEmployees = async () => {
  try {
    const res = await api.get("/api/employees");
    // extract employees array
    let employeeList = res.employees || [];

    if (
      selectedBle?.employeeId &&
      !employeeList.find((emp) => emp._id === selectedBle.employeeId._id)
    ) {
      employeeList.push(selectedBle.employeeId);
    }

    setEmployees(employeeList);
  } catch (error) {
    console.error("Error fetching employees:", error);
    setEmployees([]);
  }
};


  const loadAssets = async () => {
  try {
    const res = await api.get("/api/assets"); // full paginated response
    setAssets(res.assets || []); // extract array
  } catch (error) {
    console.error("Error fetching assets:", error);
    setAssets([]);
  }
};

  // Handle Add/Edit form input
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddFormData((prev) => ({
      ...prev,
      [name]: value === "" ? null : value,
    }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value === "" ? null : value,
    }));
  };

  // CREATE BLE
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (addFormData.employeeId && addFormData.assetId) {
        alert("Cannot assign a BLE to both employee and asset at the same time.");
        return;
      }

      await api.post("/api/ble", addFormData);
      alert("BLE successfully added!");
      await Promise.all([loadBles(), loadEmployees(), loadAssets()]);
      setShowAddModal(false);
      resetForms();
    } catch (err) {
      console.error("Error creating BLE:", err);
      alert("Failed to create BLE. Check console for details.");
    }
  };

  // EDIT BLE
  const handleEdit = (ble) => {
    setSelectedBle(ble);
    setEditFormData({
      bleId: ble.bleId,
      uuid: ble.uuid,
      major: ble.major,
      minor: ble.minor,
      type: ble.type,
      status: ble.status,
      employeeId: ble.employeeId?._id || "",
      assetId: ble.assetId?._id || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedBle) return;

    if (editFormData.employeeId && editFormData.assetId) {
      alert("Cannot assign a BLE to both employee and asset at the same time.");
      return;
    }

    try {
      const payload = {
        ...editFormData,
        employeeId: editFormData.employeeId || null,
        assetId: editFormData.assetId || null,
      };

      await api.put(`/api/ble/${selectedBle._id}`, payload);
      const updatedBle = await api.get(`/api/ble/${selectedBle._id}`);
      setSelectedBle(updatedBle);
      setBles((prev) =>
        prev.map((b) => (b._id === selectedBle._id ? updatedBle : b))
      );
      await Promise.all([loadEmployees(), loadAssets()]);
      alert("BLE updated successfully!");
      setShowEditModal(false);
      resetForms();
    } catch (err) {
      console.error("Error updating BLE:", err);
      alert("Failed to update BLE. Check console for details.");
    }
  };

  // TOGGLE STATUS
  const handleToggleStatus = async (ble) => {
    try {
      const newStatus = ble.status === "active" ? "inactive" : "active";
      await api.put(`/api/ble/${ble._id}`, { ...ble, status: newStatus });
      await loadBles();
    } catch (err) {
      console.error("Error toggling BLE status:", err);
    }
  };

  const resetForms = () => {
    setAddFormData({
      bleId: "",
      uuid: "",
      major: "",
      minor: "",
      type: "tag",
      status: "active",
      employeeId: "",
      assetId: "",
    });
    setEditFormData({
      bleId: "",
      uuid: "",
      major: "",
      minor: "",
      type: "tag",
      status: "active",
      employeeId: "",
      assetId: "",
    });
  };
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

  return (
    <div className="bg-white/80 rounded-2xl shadow p-10">
      <div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-semibold text-slate-700">BLE Tag List</h2>

  <div className="flex items-center gap-3">
    <input
      type="text"
      placeholder="Search BLE..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-[#2fc2e7]"
    />

    <button
      onClick={() => setShowAddModal(true)}
      className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-2 rounded"
    >
      Add BLE Tag
    </button>
  </div>
</div>

      <table className="w-full text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2">BLE ID</th>
            <th className="text-left py-2">UUID</th>
            <th className="text-left py-2">Major</th>
            <th className="text-left py-2">Minor</th>
            <th className="text-left py-2">Type</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">Assigned Employee</th>
            <th className="text-left py-2">Assigned Asset</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bles.length > 0 ? (
            bles.map((ble) => (
              <tr key={ble._id} className="border-b border-slate-200">
                <td className="py-2">{ble.bleId}</td>
                <td className="py-2">{ble.uuid}</td>
                <td className="py-2">{ble.major}</td>
                <td className="py-2">{ble.minor}</td>
                <td className="py-2">{ble.type}</td>
                <td className="py-2">
                  <button
                    onClick={() => handleToggleStatus(ble)}
                    className={`px-2 py-1 rounded text-xs ${
                      ble.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {ble.status}
                  </button>
                </td>
                <td className="py-2">
                  {ble.employeeId ? ble.employeeId.fullName : "—"}
                </td>
                <td className="py-2">
                  {ble.assetId ? ble.assetId.assetName : "—"}
                </td>
                <td className="py-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(ble)}
                    className="text-blue-600 px-2 py-1 font-medium hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="9"
                className="text-center py-4 text-gray-500"
              >
                No BLE tags found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {renderPagination()}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">
                Add BLE Tag
              </h3>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-3">
              {["bleId", "uuid", "major", "minor"].map((field) => (
                <input
                  key={field}
                  type={field === "major" || field === "minor" ? "number" : "text"}
                  name={field}
                  placeholder={field.toUpperCase()}
                  value={addFormData[field]}
                  onChange={handleAddChange}
                  required
                  className="border border-slate-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#2fc2e7]"
                />
              ))}

              {/* Employee Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Assign to Employee
                </label>
                <select
                  name="employeeId"
                  value={addFormData.employeeId || ""}
                  onChange={handleAddChange}
                  className="border border-slate-300 rounded-lg p-2 w-full"
                >
                  <option value="">-- No Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Assign to Asset
                </label>
                <select
  name="assetId"
  value={addFormData.assetId || ""}
  onChange={handleAddChange}
  className="border border-slate-300 rounded-lg p-2 w-full"
>
  <option value="">-- No Asset --</option>
  {assets
    .filter((asset) => !asset.bleBeacon) // only unassigned
    .map((asset) => (
      <option key={asset._id} value={asset._id}>
        {asset.assetName}
      </option>
    ))}
</select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-300 px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-1 rounded"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedBle && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">
                Edit BLE Tag
              </h3>
            </div>
            <form onSubmit={handleUpdate} className="px-6 py-4 space-y-3">
              {["bleId", "uuid", "major", "minor"].map((field) => (
                <input
                  key={field}
                  type={field === "major" || field === "minor" ? "number" : "text"}
                  name={field}
                  placeholder={field.toUpperCase()}
                  value={editFormData[field]}
                  onChange={handleEditChange}
                  required
                  className="border border-slate-300 rounded-lg p-2 w-full"
                />
              ))}

              {/* Employee Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Assign to Employee
                </label>
                <select
                  name="employeeId"
                  value={editFormData.employeeId || ""}
                  onChange={handleEditChange}
                  className="border border-slate-300 rounded-lg p-2 w-full"
                >
                  <option value="">-- No Employee --</option>
                  {employees
                    .filter(
                      (emp) => !emp.bleTag || emp._id === selectedBle.employeeId?._id
                    )
                    .map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.department})
                        {emp._id === selectedBle.employeeId?._id ? " (Current)" : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Asset Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Assign to Asset
                </label>
                <select
  name="assetId"
  value={editFormData.assetId || ""}
  onChange={handleEditChange}
  className="border border-slate-300 rounded-lg p-2 w-full"
>
  <option value="">-- No Asset --</option>
  {assets
    .filter(
      (asset) =>
        !asset.bleBeacon || asset._id === selectedBle.assetId?._id
    )
    .map((asset) => (
      <option key={asset._id} value={asset._id}>
        {asset.assetName}
        {asset._id === selectedBle.assetId?._id ? " (Current)" : ""}
      </option>
    ))}
</select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-300 px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-400 to-green-500 text-white px-4 py-1 rounded"
                >
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
