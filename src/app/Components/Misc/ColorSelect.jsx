// src/app/Components/Misc/ColorSelect.jsx

import { useState, useRef, useEffect } from "react";
import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/Colors/colors";
import { useLego } from "@/Context/LegoContext";

export default function ColorSelect({
  piece,
  colorName,
  onChange,
  isNew = true,
  availablePieceColors = [],
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localColors, setLocalColors] = useState(availablePieceColors);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const { setPiecesByTable } = useLego();

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

  // When availablePieceColors changes from props, and check whenever the dropdown is opened
  useEffect(() => {
    console.log("[ColorSelect] availablePieceColors:", availablePieceColors);
    if (availablePieceColors && availablePieceColors.length > 0) {
      // If availablePieceColors is not empty, set it to localColors
      console.log(
        "[ColorSelect] availablePieceColors is not empty, setting localColors"
      );
      setLocalColors(availablePieceColors);
    } else {
      setLocalColors([{ empty: true }]);
    }
  }, [availablePieceColors, isOpen]);

  // Check if colors need to be fetched
  const needToFetchColors =
    !localColors ||
    localColors.length === 0 ||
    localColors.some((color) => !color?.color || !color?.colorId);

  // Function to fetch colors from API
  async function fetchAvailableColors() {
    if (!piece.elementId) return;

    setIsLoading(true);
    try {
      // Fetch available colors from the API
      const res = await fetch(`/api/part/${piece.elementId}/colors`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch colors: ${res.statusText}`);
      }

      const data = await res.json();

      // Update local state first for immediate UI update
      setLocalColors(data);

      // If we have colors and no current selection, select the first one
      if (data && data.length > 0 && !colorName) {
        onChange(data[0].color);
      }

      // Update the piece data in global state if we have tableId
      if (piece.tableId && setPiecesByTable) {
        setPiecesByTable((prev) => {
          const tablePieces = prev[piece.tableId] || [];
          const updatedPieces = tablePieces.map((p) => {
            if (p.uuid === piece.uuid) {
              return {
                ...p,
                availableColors: data,
              };
            }
            return p;
          });

          return {
            ...prev,
            [piece.tableId]: updatedPieces,
          };
        });
      }

      return data;
    } catch (error) {
      console.error("Error fetching colors:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // Handle toggle dropdown
  const handleToggleDropdown = async () => {
    setIsOpen(!isOpen);

    // Only fetch if we're opening the dropdown and don't have valid colors
    if (
      isOpen &&
      needToFetchColors &&
      !isNew &&
      piece.elementId &&
      !availablePieceColors[0]?.empty
    ) {
      await fetchAvailableColors();
    }
  };

  // Filter the colors to just show available ones
  const colorOptions =
    localColors && localColors.length > 0
      ? colors.filter((c) =>
          localColors.some((apc) => String(apc.colorId) === String(c.colorId))
        )
      : [];

  return (
    <div className={`relative ${className}`}>
      {/* Color selector button */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
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

      {/* Dropdown colors */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md bg-slate-800 border border-gray-700 shadow-lg"
          style={{
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {isLoading ? (
            <div className="py-4 px-4 text-center">
              <div className="inline-block animate-spin mr-2 h-4 w-4 border-t-2 border-blue-500 rounded-full"></div>
              <span className="text-gray-300">Loading colors...</span>
            </div>
          ) : colorOptions.length > 0 ? (
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
          ) : !needToFetchColors ? (
            availablePieceColors[0]?.empty &&
            !isNew &&
            piece.elementId && (
              <div className="px-4 py-4 text-sm text-center text-gray-400">
                <button
                  onClick={fetchAvailableColors}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Click to fetch available colors
                </button>
              </div>
            )
          ) : (
            <div className="px-4 py-2 text-sm text-center text-gray-400">
              <span>No colors available</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
