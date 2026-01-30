// components/maps/MapImage.jsx
import React from "react";

export default function MapImage({
  map,
  className = "",
  style = {},
  children,
  fallbackMessage = "No map uploaded yet",
  imgRef,
}) {
  if (!map) return null;

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      {map.imageUrl ? (
        <img
          ref={imgRef}
          src={`http://localhost:3000${map.imageUrl}`}
          alt={map.name}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          {fallbackMessage}
        </div>
      )}

      {/* Render overlays: zones, gateways, employees, assets */}
      {children}
    </div>
  );
}
