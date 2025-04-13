// src/app/Components/Misc/FilterTabs.jsx

import React from "react";

const tabs = [
  { value: "all", label: "All", activeColor: "bg-blue-600" },
  { value: "incomplete", label: "Incomplete", activeColor: "bg-rose-600" },
  { value: "complete", label: "Complete", activeColor: "bg-emerald-600" },
];

export default function FilterTabs({ activeView, setActiveView }) {
  // Determine which tab is active to slide the pill
  const activeIndex = tabs.findIndex((tab) => tab.value === activeView);

  return (
    <div className="relative inline-flex h-12 w-full rounded-lg overflow-hidden bg-slate-700">
      {/* Sliding pill behind the buttons */}
      <div
        className={`
          absolute top-0 h-full w-1/3 z-0 transition-transform duration-300 ease-out rounded-lg
          ${tabs[activeIndex]?.activeColor}
        `}
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

      {/* Render each button without its own background */}
      {tabs.map((tab) => {
        const isActive = activeView === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => setActiveView(tab.value)}
            className={`
              relative flex-1 font font-medium z-10 bg-transparent transition-colors duration-300 text-center w-1/3
              ${isActive ? "text-white" : "text-slate-300 hover:text-white"}
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
