// src/app/components/Misc/CustomColorDropdown.jsx

import { useState, useRef, useEffect } from "react";
import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/Colors/colors";

export default function ColorSelect({
  colorName,
  onChange,
  availablePieceColors = [],
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter colors if availablePieceColors is provided
  const colorOptions =
    availablePieceColors.length > 0
      ? colors.filter((c) =>
          availablePieceColors.some(
            (apc) => apc.colorId.toString() === c.colorId.toString()
          )
        )
      : colors;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full p-2 border border-gray-300 rounded text-gray-100 bg-slate-800 justify-between"
        type="button"
      >
        <div className="flex items-center">
          <div
            style={getColorStyle(colorName)}
            className="mr-2 w-6 h-6 rounded-full flex-shrink-0"
          ></div>
          <span>{colorName || "Select color"}</span>
        </div>
        <svg
          className="h-5 w-5 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 mt-1 max-h-60 w-full overflow-auto rounded-md bg-slate-800 border border-gray-700 shadow-lg"
        >
          <div className="py-1">
            {colorOptions.map((color) => (
              <div
                key={color.colorName}
                className="flex items-center px-4 py-2 text-gray-200 hover:bg-slate-700 cursor-pointer"
                onClick={() => {
                  onChange(color.colorName);
                  setIsOpen(false);
                }}
              >
                <div
                  style={getColorStyle(color.colorName)}
                  className="mr-2 w-6 h-6 rounded-full flex-shrink-0"
                ></div>
                <span>{color.colorName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
