import React, { useState, useMemo } from "react";
// In StatsCard.jsx
export default function StatsCard({ title, value, icon, iconColor, iconBgColor, change }) {
  return (
    <div className="p-4 rounded-lg shadow bg-white border border-border flex flex-row justify-between items-center min-h-[100px]">
      {/* Left: icon + title + (optional) dropdown */}
      <div className="flex flex-col gap-2">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconBgColor}`}>
          {icon && React.createElement(icon, { className: `h-6 w-6 ${iconColor}` })}
        </div>
        <div className="font-semibold text-sm">{title}</div>
        {change && (
          <div className={`text-xs mt-1 ${change.isPositive ? "text-green-600" : "text-red-600"}`}>
            {change.value} <span className="text-muted-foreground">{change.text}</span>
          </div>
        )}
      </div>

      {/* Right: Value */}
      <div className="flex items-center justify-end h-full min-h-[48px]">
        {value}
      </div>
    </div>
  );
}
