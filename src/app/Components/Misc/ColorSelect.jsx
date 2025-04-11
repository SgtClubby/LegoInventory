// src/app/Components/Misc/ColorSelect.jsx

import { useState, useRef, useEffect } from "react";
import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/Colors/colors";
import { useLego } from "@/Context/LegoContext";
// test ids ignore
// 11289 trans like colors
// 11211 pretty standard

export default function ColorSelect({
  piece,
  colorName,
  onChange,
  availablePieceColors = [],
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const { setPiecesByTable, piecesByTable } = useLego();

  // We'll use the prop directly instead of duplicating in state
  // This avoids synchronization issues between props and state

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

  async function fetchAvailableColors() {
    if (!piece.elementId) return;

    setIsLoading(true);
    try {
      // Fetch available colors from the API
      const res = await fetch(`/api/part/${piece.elementId}/colors`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch colors: ${res.statusText}`);
      }
      const data = await res.json();

      console.log(data);

      // Call the parent component's onChange to update colors
      // This way we maintain a single source of truth
      if (data && data.length > 0) {
        // If we have colors and no current selection, select the first one
        if (!colorName) {
          onChange(data[0].color);
        }
        // Pass the colors back to the parent
        if (onChange && piece.tableId) {
          console.log("1");
          setPiecesByTable((prev) => {
            const tablePieces = prev[piece.tableId] || [];
            const updatedPieces = tablePieces.map((oldPiece) => {
              if (oldPiece.uuid === piece.uuid) {
                return {
                  ...oldPiece,
                  availableColors: data,
                };
              }
              return oldPiece;
            });

            return {
              ...prev,
              [piece.tableId]: updatedPieces,
            };
          });
        }
      }
    } catch (error) {
      console.error("Error fetching colors:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // some times the availablecolor can get written to the db
  // with no color or colorid, but its still fetched with the mongodb object id
  // this is a check so that the fetch is called only when the color is not in the db

  const isAvailableColorMalformed = availablePieceColors.some(
    (color) =>
      !color?.colorId ||
      !color?.color ||
      (color?.colorId === undefined && color?.color === undefined)
  );

  console.log(
    `available colors for ${piece.elementId}: ${JSON.stringify(
      availablePieceColors
    )}`
  );

  isAvailableColorMalformed &&
    availablePieceColors.length > 0 &&
    console.warn(
      `Malformed available colors for ${piece.elementId}: ${JSON.stringify(
        availablePieceColors
      )}`
    );
  // If we have availablePieceColors, we can use them to filter the colors

  // Filter colors if availablePieceColors is provided
  const colorOptions =
    availablePieceColors && availablePieceColors.length > 0
      ? colors.filter((c) =>
          availablePieceColors.some(
            (apc) => String(apc.colorId) === String(c.colorId)
          )
        )
      : [];

  const handleToggleDropdown = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    // Only fetch if we're opening the dropdown and don't have colors yet
    if (
      newIsOpen &&
      (!availablePieceColors || availablePieceColors.length === 0)
    ) {
      fetchAvailableColors();
    }

    if (isAvailableColorMalformed) {
      // If we have malformed colors, fetch again
      fetchAvailableColors();
    }
  };

  return (
    <div className={`relative ${className}`}>
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
          ) : (
            <div className="px-4 py-1 text-sm text-center text-gray-400">
              <span>Invalid piece or no colors available...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
