import React, { useState, useEffect } from "react";
import axios from "axios";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const [form, setForm] = useState({ username: "", password: "", role: "user" });

  const API = "http://localhost:3000/api/users";

  // Fetch users on load
  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await axios.get(API, { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }

  // Add user
  async function handleAdd() {
    try {
      await axios.post(API, form, { withCredentials: true });
      setShowAddModal(false);
      setForm({ username: "", password: "", role: "user" });
      fetchUsers(); // refresh
    } catch (err) {
      console.error("Error adding user:", err);
    }
  }

  // Open edit modal
  function openEdit(user) {
    setEditUser(user);
    setForm({ username: user.username, password: "", role: user.role });
    setShowEditModal(true);
  }


// Update user
async function handleEdit() {
  try {
    const payload = {
      username: form.username,
      role: form.role,
    };

    // Only include password if admin typed something
    if (form.password.trim() !== "") {
      payload.password = form.password.trim();
    }

    await axios.put(`${API}/${editUser._id}`, payload, { withCredentials: true });
    setShowEditModal(false);
    setEditUser(null);
    setForm({ username: "", password: "", role: "user" });
    fetchUsers(); // refresh
  } catch (err) {
    console.error("Error updating user:", err);
  }
}

  // Delete user
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${API}/${id}`, { withCredentials: true });
      fetchUsers(); // refresh
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  }

  if (loading) return <p>Loading users...</p>;

  return (
    <div className="bg-white/80 rounded-2xl shadow p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-slate-600 font-semibold">Users</h2>
        <button
  onClick={() => {
    setForm({ username: "", password: "", role: "user" }); // reset form
    setShowAddModal(true);
  }}
  className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-2 rounded"
>
  Add User
</button>
      </div>

      {/* Table */}
      <table className="w-full text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2">Username</th>
            <th className="text-left py-2">Role</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user) => (
              <tr key={user._id} className="border-b border-slate-200">
                <td className="py-2">{user.username}</td>
                <td className="py-2">{user.role}</td>
                <td className="py-2 flex gap-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="text-blue-600 px-2 py-1 font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user._id)}
                    className="text-red-600 px-2 py-1 font-medium hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center py-4 text-gray-500">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Add User</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="border border-slate-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#2fc2e7]"
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="border border-slate-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#2fc2e7]"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="border border-slate-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#2fc2e7]"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="px-6 py-3 border-t border-slate-300 flex justify-end gap-2">
              <button
                onClick={() => {
  setShowAddModal(false);
  setForm({ username: "", password: "", role: "user" });
}}
                className="bg-gray-300 px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="bg-gradient-to-r from-[#2fc2e7] to-[#37abc8] text-white px-4 py-1 rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg w-1/3">
            <div className="px-6 py-4 border-b border-slate-300">
              <h3 className="text-lg text-slate-600 font-semibold">Edit User</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="border border-slate-300 rounded-lg p-2 w-full"
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="border border-slate-300 rounded-lg p-2 w-full"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="border border-slate-300 rounded-lg p-2 w-full"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="px-6 py-3 border-t border-slate-300 flex justify-end gap-2">
              <button
                onClick={() => {
  setShowEditModal(false);
  setForm({ username: "", password: "", role: "user" });
  setEditUser(null);
}}
                className="bg-gray-300 px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="bg-gradient-to-r from-green-400 to-green-500 text-white px-4 py-1 rounded"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
