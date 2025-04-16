// src/app/Components/Misc/ToggleSwitch.jsx

import React from "react";

/**
 * A customizable toggle switch component that matches the app's slate theme
 *
 * @param {Object} props - Component props
 * @param {boolean} props.checked - Whether the toggle is checked/active
 * @param {Function} props.onChange - Function to call when toggle state changes
 * @param {string} [props.color="blue"] - Accent color (blue, emerald, amber, rose)
 * @param {string} [props.size="md"] - Size of the toggle (sm, md, lg)
 * @param {string} [props.label] - Optional label text to display next to the toggle
 * @param {boolean} [props.disabled=false] - Whether the toggle is disabled
 * @returns {JSX.Element} The rendered toggle switch component
 */
const ToggleSwitch = ({
  checked,
  onChange,
  color = "blue",
  size = "md",
  label,
  disabled = false,
}) => {
  // Map colors to tailwind classes
  const colorClasses = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-600",
    rose: "bg-rose-600",
  };

  // Map sizes to dimensions
  const sizeClasses = {
    sm: {
      container: "w-8 h-4",
      circle: "w-3 h-3",
      translate: "translate-x-4",
      labelText: "text-xs",
      gap: "gap-1.5",
    },
    md: {
      container: "w-11 h-6",
      circle: "w-5 h-5",
      translate: "translate-x-5",
      labelText: "text-sm",
      gap: "gap-2",
    },
    lg: {
      container: "w-14 h-7",
      circle: "w-6 h-6",
      translate: "translate-x-7",
      labelText: "text-base",
      gap: "gap-3",
    },
  };

  // Selected classes based on props
  const selectedColor = colorClasses[color] || colorClasses.blue;
  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center ${selectedSize.gap}`}>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex shrink-0 cursor-pointer rounded-full border-2
          border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
          focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800
          ${selectedSize.container} ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:brightness-110 active:brightness-90"
        } ${
          checked
            ? selectedColor
            : "bg-slate-700 hover:bg-slate-600 active:bg-slate-700"
        }`}
        disabled={disabled}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={`pointer-events-none inline-block rounded-full 
            bg-white shadow transform ring-0 transition duration-200 ease-in-out
            ${selectedSize.circle} ${
            checked ? selectedSize.translate : "translate-x-0"
          }`}
        />
      </button>

      {label && (
        <span
          className={`${selectedSize.labelText} font-medium ${
            disabled ? "text-slate-500" : "text-slate-300"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default ToggleSwitch;
