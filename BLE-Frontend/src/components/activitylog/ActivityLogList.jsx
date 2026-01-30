import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

export default function ActivityLogList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch logs when page or debounced search changes
  useEffect(() => {
    fetchLogs();
  }, [page, debouncedSearch]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit,
        search: debouncedSearch,
      }).toString();

      const data = await api.get(`/api/activity-log?${query}`);
      setLogs(data.logs);
      setTotalPages(data.pages);
      setTotalLogs(data.total);
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  const renderPagination = () => {
  if (totalPages <= 1) return null;

  const pagesToShow = 5;
  let startPage = Math.max(1, page - Math.floor(pagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + pagesToShow - 1);

  if (endPage - startPage < pagesToShow - 1) {
    startPage = Math.max(1, endPage - pagesToShow + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  return (
    <div className="flex justify-end gap-2 mt-6 items-center">
      {/* Jump to first */}
      <button
        disabled={page === 1}
        onClick={() => setPage(1)}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        {"<<"}
      </button>

      {/* Prev */}
      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        Prev
      </button>

      {/* Page numbers */}
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

      {/* Next */}
      <button
        disabled={page === totalPages}
        onClick={() => setPage(page + 1)}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        Next
      </button>

      {/* Jump to last */}
      <button
        disabled={page === totalPages}
        onClick={() => setPage(totalPages)}
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
        <h2 className="text-xl text-slate-600 font-semibold">Activity Log</h2>
        <input
          type="text"
          placeholder="Search by username, action, or description..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#2fc2e7]"
        />
      </div>

      {/* Show total logs */}
      <p className="text-slate-500 text-sm mb-2">
        Total Logs: {totalLogs}
      </p>

      {loading ? (
        <p className="text-center text-slate-500 py-4">Loading activity logs...</p>
      ) : (
        <>
          <table className="w-full text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="text-left py-2">User ID</th>
                <th className="text-left py-2">Activity Type</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">IP Address</th>
                <th className="text-left py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id} className="border-b border-slate-200">
                    <td className="py-2">{log.user?.username || "System"}</td>
                    <td className="py-2">{log.action}</td>
                    <td className="py-2">{log.description}</td>
                    <td className="py-2">{log.ipAddress || "-"}</td>
                    <td className="py-2">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No activity logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {renderPagination()}
        </>
      )}
    </div>
  );
}
