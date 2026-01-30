import React, { useEffect, useState } from "react";
import api from "../../services/api";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);

  const [newEmployee, setNewEmployee] = useState({
    employeeId: "",
    fullName: "",
    department: "",
    position: "",
    status: "active",
    bleTag: "",
    allowedZones: [],
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const limit = 10;

  const [bleList, setBleList] = useState([]);
  const [zoneList, setZoneList] = useState([]);

  /* =======================
     Load BLE tags
  ======================= */
  async function loadBles() {
    try {
      const list = await api.get("/api/ble/unassigned");
      setBleList(Array.isArray(list) ? list : []);
    } catch {
      setBleList([]);
    }
  }

  /* =======================
     Load zones
  ======================= */
  async function loadZones() {
    try {
      const list = await api.get("/api/zones");
      setZoneList(Array.isArray(list) ? list : []);
    } catch {
      setZoneList([]);
    }
  }

  /* =======================
     Fetch employees
  ======================= */
  async function fetchEmployees() {
    try {
      const res = await api.get(
        `/api/employees?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
      );

      setEmployees(Array.isArray(res.employees) ? res.employees : []);
      setPages(res.pages || 1);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    fetchEmployees();
    loadBles();
    loadZones();
  }, []);

  /* =======================
     Create employee
  ======================= */
  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/api/employees", newEmployee);
      setShowAddModal(false);
      setNewEmployee({
        employeeId: "",
        fullName: "",
        department: "",
        position: "",
        status: "active",
        bleTag: "",
        allowedZones: [],
      });
      await Promise.all([fetchEmployees(), loadBles()]);
    } catch {
      alert("Error creating employee");
    } finally {
      setCreating(false);
    }
  }

  /* =======================
     Edit employee
  ======================= */
  function handleEdit(emp) {
    const allowedZones = emp.allowedZones?.map((z) => z._id) || [];
    setEditEmployee({ ...emp, allowedZones });
    setShowEditModal(true);
  }

  /* =======================
     Update employee
  ======================= */
  async function handleUpdate(e) {
    e.preventDefault();
    try {
      const payload = { ...editEmployee };

      if (payload.bleTag && typeof payload.bleTag === "object") {
        payload.bleTag = payload.bleTag._id;
      }
      if (payload.bleTag === "") payload.bleTag = null;

      await api.put(`/api/employees/${editEmployee._id}`, payload);
      setShowEditModal(false);
      await Promise.all([fetchEmployees(), loadBles()]);
    } catch (err) {
      alert("Error updating employee");
    }
  }

  /* =======================
     Pagination renderer
  ======================= */
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

  if (loading) return <div>Loading employees...</div>;

  return (
    <div className="bg-white/80 rounded-2xl shadow p-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-slate-600 font-semibold">Employees</h2>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-[#2fc2e7]"
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-2 rounded"
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2">Employee ID</th>
            <th className="text-left py-2">Full Name</th>
            <th className="text-left py-2">Department</th>
            <th className="text-left py-2">Position</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">BLE Tag</th>
            <th className="text-left py-2">Zones</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.length > 0 ? (
            employees.map((emp) => (
              <tr key={emp._id} className="border-b border-slate-200">
                <td className="py-2">{emp.employeeId}</td>
                <td className="py-2">{emp.fullName}</td>
                <td className="py-2">{emp.department || "-"}</td>
                <td className="py-2">{emp.position || "-"}</td>
                <td className="py-2">
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    active
                  </span>
                </td>
                <td className="py-2">{emp.bleTag?.bleId || "—"}</td>
                <td className="py-2">
                  {emp.allowedZones?.map((z) => z.name).join(", ") || "-"}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => {
  setEditEmployee({
    ...emp,
    allowedZones: emp.allowedZones?.map(z => z._id) || []
  });
  setShowEditModal(true);
}}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="text-center py-4 text-gray-500">
                No employees found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      

      {renderPagination()}



      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Add Employee</h3>
            </div>
            <form onSubmit={handleCreate}>
              <div className="px-6 py-4 space-y-3">
                {["fullName", "department", "position"].map((field) => (
                  <input
                    key={field}
                    type="text"
                    placeholder={field.replace(/^\w/, (c) => c.toUpperCase())}
                    className="border border-slate-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#2fc2e7]"
                    value={newEmployee[field]}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, [field]: e.target.value })
                    }
                  />
                ))}

                {/* Zones Checkboxes */}
                <div className="border border-slate-300 rounded-lg p-2 w-full">
                  <p className="font-medium mb-1">Allowed Zones:</p>
                  {zoneList.map((zone) => (
                    <label key={zone._id} className="block">
                      <input
                        type="checkbox"
                        value={zone._id}
                        checked={newEmployee.allowedZones.includes(zone._id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNewEmployee((prev) => ({
                            ...prev,
                            allowedZones: checked
                              ? [...prev.allowedZones, zone._id]
                              : prev.allowedZones.filter((z) => z !== zone._id),
                          }));
                        }}
                        className="mr-2"
                      />
                      {zone.name}
                    </label>
                  ))}
                </div>

                {/* BLE Dropdown */}
                <select
                  value={newEmployee.bleTag || ""}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, bleTag: e.target.value || null })
                  }
                  className="border border-slate-300 rounded-lg p-2 w-full"
                >
                  <option value="">No BLE Tag</option>
                  {bleList.map((tag) => (
                    <option key={tag._id} value={tag._id}>
                      {tag.macAddress || tag.bleId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-6 py-3 border-t border-slate-300 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-300 px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-1 rounded"
                >
                  {creating ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editEmployee && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Edit Employee</h3>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="px-6 py-4 space-y-3">
                {["fullName", "department", "position"].map((field) => (
                  <input
                    key={field}
                    type="text"
                    placeholder={field}
                    className="border border-slate-300 rounded-lg p-2 w-full"
                    value={editEmployee[field] || ""}
                    onChange={(e) => setEditEmployee({...editEmployee, [field]: e.target.value,})}//bleTag: e.target.value || null (changed)

                  />
                ))}

                {/* Zones Checkboxes */}
                <div className="border border-slate-300 rounded-lg p-2 w-full">
                  <p className="font-medium mb-1">Allowed Zones:</p>
                  {zoneList.map((zone) => (
                    <label key={zone._id} className="block">
                      <input
                        type="checkbox"
                        value={zone._id}
                        checked={editEmployee.allowedZones.includes(zone._id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditEmployee((prev) => ({
                            ...prev,
                            allowedZones: checked
                              ? [...prev.allowedZones, zone._id]
                              : prev.allowedZones.filter((z) => z !== zone._id),
                          }));
                        }}
                        className="mr-2"
                      />
                      {zone.name}
                    </label>
                  ))}
                </div>

                {/* BLE Dropdown */}
                <select
                  value={editEmployee.bleTag?._id || editEmployee.bleTag || ""}
                  onChange={(e) =>
                    setEditEmployee({
                      ...editEmployee,
                      bleTag: e.target.value || null,
                    })
                  }
                  className="border border-slate-300 rounded-lg p-2 w-full"
                >
                  <option value="">No BLE Tag</option>
                  {editEmployee.bleTag && (
                    <option value={editEmployee.bleTag._id || editEmployee.bleTag}>
                      {editEmployee.bleTag?.macAddress ||
                        editEmployee.bleTag?.bleId ||
                        editEmployee.bleTag}{" "}
                      (Current)
                    </option>
                  )}
                  {bleList
                    .filter((tag) => tag._id !== editEmployee.bleTag?._id)
                    .map((tag) => (
                      <option key={tag._id} value={tag._id}>
                        {tag.macAddress || tag.bleId}
                      </option>
                    ))}
                </select>
              </div>

              <div className="px-6 py-3 border-t border-slate-300 flex justify-end gap-2">
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
