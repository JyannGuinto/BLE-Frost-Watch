import React from "react";

export default function ReportList() {
  // Mock data
  const history = [
    {
      id: 1,
      employee: "John Doe",
      timeIn: "2025-10-23 08:00",
      timeOut: "2025-10-23 08:45",
      timeSpent: "45 mins",
      danger: false,
    },
    {
      id: 2,
      employee: "Mary Smith",
      timeIn: "2025-10-23 09:00",
      timeOut: "2025-10-23 09:40",
      timeSpent: "40 mins",
      danger: true,
    },
    {
      id: 3,
      employee: "Peter Parker",
      timeIn: "2025-10-23 10:15",
      timeOut: "2025-10-23 11:10",
      timeSpent: "55 mins",
      danger: true,
    },
  ];

  return (
    <div className="bg-white/80 rounded-2xl shadow p-10">
      <h2 className="text-xl text-slate-600 font-semibold mb-4">Warehouse History</h2>

      <table className="w-full text-sm text-slate-600">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2">Employee</th>
            <th className="text-left py-2">Time In</th>
            <th className="text-left py-2">Time Out</th>
            <th className="text-left py-2">Time Spent</th>
            <th className="text-left py-2">Danger</th>
          </tr>
        </thead>
        <tbody>
          {history.length > 0 ? (
            history.map((record) => (
              <tr key={record.id} className="border-b border-slate-200">
                <td className="py-2">{record.employee}</td>
                <td className="py-2">{record.timeIn}</td>
                <td className="py-2">{record.timeOut}</td>
                <td className="py-2">{record.timeSpent}</td>
                <td className="py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      record.danger
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {record.danger ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-4 text-gray-500">
                No history found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
