import React, { useEffect, useState } from "react";
import api from "../services/api";
import MapContainer from "../components/MapContainer";

export default function Dashboard() {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadLatest() {
      try {
        const res = await api.get("/api/location/latest"); // adjust to your backend route
        if (mounted) setLatest(res);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadLatest();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Live Map</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded shadow p-4">
          <MapContainer latest={latest} />
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-medium">Last detection</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : latest ? (
            <div className="mt-3">
              <div><b>BLE:</b> {latest.bleMac}</div>
              <div><b>Gateway:</b> {latest.gatewayMac}</div>
              <div><b>RSSI:</b> {latest.rssi}</div>
              <div><b>Time:</b> {new Date(latest.timestamp).toLocaleString()}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}