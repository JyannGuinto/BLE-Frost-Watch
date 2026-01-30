import React, { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import MapImage from "../maps/MapImage";

export default function ZoneMapEditor({ map, zones = [], onZonesChanged = () => {} }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const [localZones, setLocalZones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("idle"); // idle | drawing | moving | resizing
  const [drawingRect, setDrawingRect] = useState(null);

  const dragState = useRef(null);
  const resizeState = useRef(null);

  useEffect(() => setLocalZones(zones || []), [zones]);

  function toPercentPos(clientX, clientY) {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }

  // --- Mouse Handlers ---
  function onMouseDown(e) {
    if (e.button !== 0) return;

    const pos = toPercentPos(e.clientX, e.clientY);

    // Check if clicked on a resize handle first
    if (resizeState.current) return;

    // Check if clicked on existing zone
    const clickedZone = localZones.find(
      (z) => pos.x >= z.x && pos.x <= z.x + z.width && pos.y >= z.y && pos.y <= z.y + z.height
    );

    if (clickedZone) {
      setSelected(clickedZone);
      dragState.current = {
        startX: pos.x,
        startY: pos.y,
        origX: clickedZone.x,
        origY: clickedZone.y,
        zone: { ...clickedZone },
      };
      setMode("moving");
      return;
    }

    // Start drawing new zone
    setMode("drawing");
    setDrawingRect({ x: pos.x, y: pos.y, width: 0, height: 0, name: "New Zone" });
    setSelected(null);
  }

  function onMouseMove(e) {
    const pos = toPercentPos(e.clientX, e.clientY);

    // Drawing
    if (mode === "drawing" && drawingRect) {
      const x = Math.min(drawingRect.x, pos.x);
      const y = Math.min(drawingRect.y, pos.y);
      const width = Math.abs(pos.x - drawingRect.x);
      const height = Math.abs(pos.y - drawingRect.y);
      setDrawingRect({ ...drawingRect, x, y, width, height });
    }

    // Moving
    if (mode === "moving" && dragState.current) {
      const dx = pos.x - dragState.current.startX;
      const dy = pos.y - dragState.current.startY;
      const nz = { ...dragState.current.zone };
      nz.x = Math.max(0, Math.min(100 - nz.width, dragState.current.origX + dx));
      nz.y = Math.max(0, Math.min(100 - nz.height, dragState.current.origY + dy));
      setLocalZones((prev) => prev.map((z) => (z._id === nz._id ? nz : z)));
      setSelected(nz);
    }

    // Resizing
    if (mode === "resizing" && resizeState.current) {
      const s = resizeState.current;
      const dx = pos.x - s.startX;
      const dy = pos.y - s.startY;
      const z = { ...s.zone };

      switch (s.handle) {
        case "tl":
          z.x = Math.max(0, s.origX + dx);
          z.y = Math.max(0, s.origY + dy);
          z.width = Math.max(1, s.origW - dx);
          z.height = Math.max(1, s.origH - dy);
          break;
        case "tr":
          z.y = Math.max(0, s.origY + dy);
          z.width = Math.max(1, s.origW + dx);
          z.height = Math.max(1, s.origH - dy);
          break;
        case "bl":
          z.x = Math.max(0, s.origX + dx);
          z.width = Math.max(1, s.origW - dx);
          z.height = Math.max(1, s.origH + dy);
          break;
        case "br":
          z.width = Math.max(1, s.origW + dx);
          z.height = Math.max(1, s.origH + dy);
          break;
      }

      setLocalZones((prev) => prev.map((zone) => (zone._id === z._id ? z : zone)));
      setSelected(z);
    }
  }

  async function onMouseUp() {
    // Finish drawing
    if (mode === "drawing" && drawingRect) {
      if (drawingRect.width > 0.5 && drawingRect.height > 0.5) {
        try {
          const payload = { ...drawingRect, map: map._id, type: "rect" };
          const created = await api.post("/api/zones", payload);
          const newZone = created.data || created;
          setLocalZones((prev) => [...prev, newZone]);
          setSelected(newZone);
          onZonesChanged();
        } catch (err) {
          console.error(err);
          alert("Failed to create zone");
        }
      }
      setDrawingRect(null);
      setMode("idle");
    }

    // Finish moving
if (mode === "moving" && dragState.current) {
  const nz = dragState.current.zone;
  try {
    // Immediately update backend, but do not refetch zones yet
    await api.put(`/api/zones/${nz._id}`, nz);
    // onZonesChanged(); // Remove this
  } catch (err) {
    console.error(err);
  }
  dragState.current = null;
  setMode("idle");
}

    // Finish resizing
   if (mode === "resizing" && resizeState.current) {
  const z = resizeState.current.zone;
  try {
    await api.put(`/api/zones/${z._id}`, z);
    // onZonesChanged(); // Remove this
  } catch (err) {
    console.error(err);
  }
  resizeState.current = null;
  setMode("idle");
}
  }

  function onMouseLeave() {
    onMouseUp();
  }

  function onResizeMouseDown(e, z, handle) {
    e.stopPropagation();
    setSelected(z);
    setMode("resizing");
    const pos = toPercentPos(e.clientX, e.clientY);
    resizeState.current = {
      startX: pos.x,
      startY: pos.y,
      zone: { ...z },
      origX: z.x,
      origY: z.y,
      origW: z.width,
      origH: z.height,
      handle,
    };
  }

  async function handleUpdateSelected(updates) {
    if (!selected) return;
    const merged = { ...selected, ...updates };
    try {
      const updated = await api.put(`/api/zones/${selected._id}`, merged);
      setLocalZones((prev) => prev.map((z) => (z._id === updated._id ? updated : z)));
      setSelected(updated);
      onZonesChanged();
    } catch (err) {
      console.error(err);
      alert("Failed to update zone");
    }
  }

  async function handleDeleteSelected() {
    if (!selected) return;
    if (!window.confirm("Delete zone?")) return;
    try {
      await api.delete(`/api/zones/${selected._id}`);
      setLocalZones((prev) => prev.filter((z) => z._id !== selected._id));
      setSelected(null);
      onZonesChanged();
    } catch (err) {
      console.error(err);
      alert("Failed to delete zone");
    }
  }

  // --- Render ---
  return (
    <div className="w-full h-full flex gap-4">
      <div
        ref={containerRef}
        className="relative flex-1 bg-white rounded-lg shadow-inner overflow-hidden"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{ userSelect: "none", cursor: mode === "drawing" ? "crosshair" : "default" }}
      >
        <MapImage map={map} imgRef={imgRef}>
  {localZones.map((z) => {
    const mapId = typeof z.map === "object" ? z.map._id || z.map.id : z.map;
    if (String(mapId) !== String(map._id)) return null;

    const style = {
      position: "absolute",
      left: `${z.x}%`,
      top: `${z.y}%`,
      width: `${z.width}%`,
      height: `${z.height}%`,
      border: selected && selected._id === z._id ? "2px dashed #2563eb" : "2px solid rgba(34,197,94,0.95)",
      background: "rgba(34,197,94,0.08)",
      cursor: "move",
      zIndex: selected && selected._id === z._id ? 40 : 30,
    };

    const handles = [
      { name: "tl", left: 0, top: 0, cursor: "nwse-resize" },
      { name: "tr", left: "100%", top: 0, cursor: "nesw-resize", translateX: -100 },
      { name: "bl", left: 0, top: "100%", cursor: "nesw-resize", translateY: -100 },
      { name: "br", left: "100%", top: "100%", cursor: "nwse-resize", translateX: -100, translateY: -100 },
    ];

    return (
      <div key={z._id} style={style} title={z.name}>
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            fontSize: "0.7rem",
            color: "#2563eb",
            fontWeight: "600",
            background: "rgba(255,255,255,0.7)",
            padding: "0 2px",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        >
          {z.name}
        </span>
        {selected && selected._id === z._id &&
          handles.map((h) => (
            <div
              key={h.name}
              onMouseDown={(e) => onResizeMouseDown(e, z, h.name)}
              style={{
                width: 8,
                height: 8,
                background: "#2563eb",
                position: "absolute",
                borderRadius: "50%",
                left: h.left,
                top: h.top,
                cursor: h.cursor,
                transform: `translate(${h.translateX || 0}%, ${h.translateY || 0}%)`,
                zIndex: 50,
              }}
            />
          ))}
      </div>
    );
  })}

  {/* Drawing preview */}
  {drawingRect && (
    <div
      style={{
        position: "absolute",
        left: `${drawingRect.x}%`,
        top: `${drawingRect.y}%`,
        width: `${drawingRect.width}%`,
        height: `${drawingRect.height}%`,
        border: "2px dashed rgba(59,130,246,0.9)",
        background: "rgba(59,130,246,0.06)",
        zIndex: 50,
      }}
    />
  )}
</MapImage>

      </div>

      {/* Sidebar */}
      <div className="w-[340px] bg-white rounded-lg shadow p-3 flex flex-col gap-3">
        <h4 className="font-semibold text-slate-700">{map.name} — Zones</h4>
        <div className="flex-1 overflow-auto">
          {selected ? (
            <div>
              <label className="block text-sm text-slate-600">Selected Zone</label>
              <input
                className="border rounded p-2 w-full my-2"
                value={selected.name || ""}
                onChange={(e) => {
                  setSelected({ ...selected, name: e.target.value });
                  setLocalZones((prev) =>
                    prev.map((z) => (z._id === selected._id ? { ...z, name: e.target.value } : z))
                  );
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                {["x", "y", "width", "height"].map((k) => (
                  <input
                    key={k}
                    className="border rounded p-2"
                    type="number"
                    step="0.1"
                    value={selected[k]}
                    onChange={(e) =>
                      setSelected({ ...selected, [k]: Number(e.target.value) })
                    }
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleUpdateSelected(selected)} className="bg-green-500 text-white px-3 py-1 rounded">Save</button>
                <button onClick={handleDeleteSelected} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
                <button onClick={() => setSelected(null)} className="bg-gray-200 px-3 py-1 rounded">Deselect</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Click a zone to select it. Draw a new zone by dragging on the map.</div>
          )}
        </div>
      </div>
    </div>
  );
}
