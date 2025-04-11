// src/app/components/Misc/CustomColorDropdown.jsx

import React, { useState, useRef, useEffect } from "react";
import colors from "@/colors/colors.js";

const CustomColorDropdown = ({
  piece,
  availablePieceColors = [], // Add default value
  colorName,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableColors, setAvailableColors] = useState(availablePieceColors);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedColors, setHasLoadedColors] = useState(false); // Track if we've loaded colors
  const dropdownRef = useRef(null);

  // Update local state when prop changes
  useEffect(() => {
    if (availablePieceColors?.length > 0) {
      setAvailableColors(availablePieceColors);
      setHasLoadedColors(true);
    }
  }, [availablePieceColors]);

  // Only fetch if not already loaded and dropdown is opened
  useEffect(() => {
    if (
      isOpen &&
      !hasLoadedColors &&
      availableColors.length === 0 &&
      piece?.elementId &&
      !isLoading
    ) {
      setIsLoading(true);
      console.log(`Fetching colors for ${piece.elementId}`);

      fetch(`/api/part/${piece.elementId}/colors`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Fetched colors:", data);
          setAvailableColors(data);
          setHasLoadedColors(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching colors:", err);
          setIsLoading(false);
        });
    }
  }, [isOpen, piece?.elementId, hasLoadedColors, availableColors.length]);

  const currentHex = colors.find((c) => c.colorName === colorName)?.hex;
  const currentColor = colors.find((c) => c.colorName === colorName)?.colorName;

  // Transform the API available colors to the format expected by CustomColorDropdown
  const formattedAvailableColors = availableColors?.map((color) => {
    const fullColorInfo = colors.find((c) => c.colorName === color.color) || {};
    return {
      colorId: color.colorId,
      colorName: color.color, // Use the 'color' property from API as 'colorName'
      hex: fullColorInfo.hex || "#CCCCCC", // Default color if not found
    };
  });

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

  const handleSelect = (chosenColor) => {
    onChange(chosenColor);
    setIsOpen(false);
  };

  return (
    <div
      className={`relative w-full ${
        isOpen ?? "z-[99999]"
      } min-w-48 ${className}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className="w-full text-gray-200 pl-3 py-2 pr-4 border border-gray-300 rounded text-left flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className="w-6 h-6 min-w-6 aspect-square mr-2 rounded-sm"
          style={{
            backgroundColor: currentHex,
            border: "1px solid #ccc",
          }}
        />
        {currentColor}
      </button>

      {isOpen && (
        <div className="transition-all z-20 absolute w-full mt-1 bg-slate-800 border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-1">
            {formattedAvailableColors?.length === 0 && (
              <div className="text-gray-400 text-sm text-center">
                No available colors
              </div>
            )}
            {formattedAvailableColors?.map((color) => (
              <div
                key={color.colorId}
                className="cursor-pointer text-gray-200 rounded-sm px-2 py-1 flex items-center hover:opacity-90"
                onClick={() => handleSelect(color.colorName)}
              >
                <div
                  className="w-6 h-6 min-w-6 aspect-square mr-2 rounded-sm"
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
