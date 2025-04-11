// src/app/components/Table/PieceRowColumns/PieceColor.jsx

import { useState, useRef, useEffect } from "react";
import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/colors/colors";

export default function PieceColor({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const { elementColor } = piece;
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

  return (
    <div className={`${colBase} ${columnWidths.color} flex-1 relative`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full bg-transparent border-0 text-gray-200"
        type="button"
      >
        <div
          style={getColorStyle(elementColor)}
          className="mr-2 w-6 h-6 rounded-full flex-shrink-0"
        ></div>
        <span className="truncate">{elementColor || "Select color"}</span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 mt-1 w-64 rounded-md bg-slate-800 border border-gray-700 shadow-lg"
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 9999, // Very high z-index to ensure it's above everything
            top: "100%", // Position right below the button
          }}
        >
          <div className="py-1">
            {colors.map((color) => (
              <div
                key={color.colorName}
                className="flex items-center px-4 py-2 text-gray-200 hover:bg-slate-700 cursor-pointer"
                onClick={() => {
                  onChange("elementColor", originalId, color.colorName);
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
