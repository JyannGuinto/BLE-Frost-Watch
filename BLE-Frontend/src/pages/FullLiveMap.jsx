import React, { useEffect, useState } from "react";
import LiveMap from "../components/livemap/LiveMap";

export default function FullLiveMap() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      
      const baseWidth = 1200;
      const baseHeight = 800;

      const scaleX = window.innerWidth / baseWidth;
      const scaleY = window.innerHeight / baseHeight;

      
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="w-screen h-screen bg-gray-100 flex items-center justify-center overflow-hidden"
      style={{ position: "fixed", top: 0, left: 0 }}
    >
      <div
        style={{
          width: "1200px", // base width
          height: "800px", // base height
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          transition: "transform 0.3s ease",
        }}
      >
        <LiveMap isFullScreen={true} />
      </div>
    </div>
  );
}
