import React, { useState, useEffect } from "react";

export default function StatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="simulated-status-bar" className="w-full flex justify-between items-center px-8 pt-8 pb-3 bg-[#111111] text-[#F2F2F2] text-sm select-none relative z-50 font-sans">
      {/* Left: Time */}
      <span className="font-semibold tracking-wide text-xs">{time}</span>

      {/* Middle: Minimal Camera Punch Hole */}
      <div className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-black border border-[#222222] flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0E0E0E]"></div>
      </div>

      {/* Right: Custom Status indicators from Editorial Theme */}
      <div className="flex items-center space-x-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-white opacity-20" title="Wifi"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-white opacity-20" title="Signal"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-white opacity-80 animate-pulse" title="Connected"></div>
      </div>
    </div>
  );
}

