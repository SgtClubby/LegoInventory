// src/app/Components/Misc/ColorSelect.jsx

import { useState, useRef } from "react";
import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/Colors/colors";
import { useLego } from "@/Context/LegoContext";
import { ExpandMoreRounded } from "@mui/icons-material";

export default function ColorSelect({
  piece,
  colorName,
  onChange,
  isNew = true,
  availablePieceColors,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localColors, setLocalColors] = useState(availablePieceColors);
  const [hasSuccessfullyFetched, setHasSuccessfullyFetched] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const { setPiecesByTable, selectedTable } = useLego();

  // Function to fetch colors from API
  async function fetchAvailableColors() {
    if (!piece.elementId) return;

    setIsLoading(true);
    try {
      const url =
        piece.cacheIncomplete === true
          ? `/api/part/${piece.elementId}-ic/colors`
          : `/api/part/${piece.elementId}/colors`;

      const res = await fetch(url, {
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
      setHasSuccessfullyFetched(true);

      // If we have colors and no current selection, select the first one
      if (data && data.length > 0 && !colorName) {
        onChange(data[0].color);
      }

      // Update the piece data in global state if we have tableId
      if (setPiecesByTable && selectedTable && piece.uuid) {
        setPiecesByTable((prev) => {
          // Create a new array for the table's pieces, with the updated piece
          const updatedPieces = prev[selectedTable.id].map((p) => {
            if (p.uuid === piece.uuid) {
              return {
                ...p,
                availableColors: data,
                cacheIncomplete: false,
              };
            }
            return p;
          });

          // Return new state object with updated table pieces
          return {
            ...prev,
            [selectedTable.id]: updatedPieces,
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
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    // Only fetch if we're opening the dropdown, don't have valid colors, and haven't already successfully fetched
    if (
      newIsOpen &&
      !hasSuccessfullyFetched &&
      !isNew &&
      piece.elementId &&
      (needToFetchColors || piece.cacheIncomplete) &&
      !availablePieceColors[0]?.empty
    ) {
      await fetchAvailableColors();
    }
  };

  // Check if colors need to be fetched
  const needToFetchColors =
    !localColors ||
    localColors.length === 0 ||
    localColors.some((color) => !color?.color || !color?.colorId);

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
        <ExpandMoreRounded fontSize="small" />
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
