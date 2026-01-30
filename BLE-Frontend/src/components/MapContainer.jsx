import React from "react";

export default function MapContainer({ latest }) {
  return (
    <div className="h-96 bg-slate-100 flex items-center justify-center rounded">
      {latest ? (
        <div className="text-center">
          <div className="text-lg font-semibold">BLE: {latest.bleMac}</div>
          <div className="text-sm text-gray-600">RSSI: {latest.rssi}</div>
        </div>
      ) : (
        <div className="text-gray-500">No location to show</div>
      )}
    </div>
  );
}