// src/app/components/Main/CustomColorDropdown.jsx

import React, { useState, useRef, useEffect } from "react";
import { getContrastTextColor } from "../../utils/colorUtils";

/**
 * Custom color dropdown component that shows color samples with proper text contrast
 *
 * @param {Object} props - Component props
 * @param {Array} props.colors - List of color objects with colorName and hex properties
 * @param {string} props.value - Currently selected color name
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} props.className - Additional CSS classes
 */
const CustomColorDropdown = ({ colors, value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(
    value ? colors.find((c) => c.colorName === value) : null
  );
  const dropdownRef = useRef(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (color) => {
    setSelectedColor(color);
    onChange(color.colorName);
    setIsOpen(false);
  };

  // Find the selected color object
  const selectedColorObj = selectedColor || {
    colorName: "Select color",
    hex: "#1f2937",
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full text-gray-200 pl-3 py-2 pr-4 border border-gray-300 rounded text-left flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className="w-6 h-6 mr-2 rounded-sm"
          style={{
            backgroundColor: selectedColorObj.hex,
            border: "1px solid #ccc",
          }}
        />
        {selectedColorObj.colorName}
      </button>

      {isOpen && (
        <div className="transition-all absolute z-50 w-full mt-1 bg-slate-800 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-1">
            {colors.map((color) => (
              <div
                key={color.colorName}
                className="cursor-pointer text-gray-200 rounded-sm px-2 py-1 flex items-center hover:opacity-90"
                onClick={() => handleSelect(color)}
              >
                <div
                  className="w-6 h-6 mr-3 rounded-sm"
                  style={{
                    backgroundColor: color.hex,
                    border: "1px solid #ccc",
                  }}
                />
                {color.colorName}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomColorDropdown;
