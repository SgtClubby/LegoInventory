// src/app/Components/Table/PieceRow/Piece/PieceDesktopView.jsx
import getColorStyle from "@/lib/Misc/getColorStyle";
import React, { useState, useRef, useEffect } from "react";

import {
  BookmarkRounded,
  DeleteForever,
  ExpandMoreRounded,
  RefreshRounded,
} from "@mui/icons-material";
import ColorDropdown from "../ColorDropdown";

/**
 * Desktop view for piece items in the table
 *
 * @param {Object} originalProps - Original props passed from parent
 * @param {Function} handleDeleteClick - Function to handle delete action
 * @param {Function} handleChange - Function to handle field changes
 * @param {Object} fields - Current field values
 * @param {React.ReactNode} LoadingOverlay - Loading overlay component
 * @param {Function} setHighlighted - Function to toggle highlighted state
 * @param {boolean} highlighted - Whether the item is highlighted
 * @param {boolean} isUpdating - Whether the item is currently updating
 * @param {boolean} countComplete - Whether all required quantities are met
 * @returns {React.ReactElement} The PieceDesktopView component
 */
export default function PieceDesktopView({
  originalProps,
  handleDeleteClick,
  handleChange,
  fields,
  LoadingOverlay,
  setHighlighted,
  highlighted,
  isUpdating,
  countComplete,
}) {
  const { piece, columns } = originalProps;

  // Use fields instead of piece for most display, but keep piece.availableColors and elementColorId
  // since those are used for the color dropdown logic
  const { availableColors } = piece;

  const colorContainerRef = useRef(null);
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  useEffect(() => {
    let timeout;
    function handleClickOutside(event) {
      if (
        colorContainerRef.current &&
        !colorContainerRef.current.contains(event.target) &&
        showColorDropdown
      ) {
        timeout = setTimeout(() => {
          setShowColorDropdown(false);
        }, 100); // Delay to allow dropdown to close before setting state
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timeout);
    };
  }, [colorContainerRef, showColorDropdown]);

  const getRowStyle = () => {
    if (highlighted)
      return "bg-pink-900/40 hover:bg-pink-800/40 border-pink-700/30";
    if (countComplete)
      return "bg-emerald-900/30 hover:bg-emerald-800/30 border-emerald-700/30";
    return "bg-slate-800/70 hover:bg-slate-700/50 border-slate-700/40";
  };

  return (
    <div className="animate-slideDown">
      <div
        key="desktop"
        className={`hidden switch:flex items-center w-full px-2 py-2 mx-1 my-1 rounded-lg border-l-4 border-b-1 border-t-1 ${getRowStyle()} transition-colors duration-150 shadow-md/20 `}
      >
        {LoadingOverlay}

        {/* Image */}
        <div
          className={`${columns[0]?.width} flex-shrink-0 flex justify-center px-2`}
        >
          <div className="h-16 w-16 bg-slate-700/80 rounded-lg overflow-hidden flex items-center justify-center relative">
            {availableColors?.find(
              (color) => color.colorId == piece.elementColorId
            )?.elementImage ? (
              <img
                src={
                  availableColors.find(
                    (color) => color.colorId == piece.elementColorId
                  )?.elementImage
                }
                alt={fields.elementName}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                {!piece?.invalid && (
                  <RefreshRounded
                    className={`h-6 w-6 text-slate-300 absolute cursor-pointer ${
                      isUpdating ? "animate-spin" : ""
                    }`}
                    onClick={() => {
                      handleChange({
                        field: "elementId",
                        value: fields.elementId,
                      });
                    }}
                    title="Refresh image"
                    fontSize="small"
                  />
                )}
                <span className="text-xs text-center text-slate-500">
                  No image
                </span>
              </>
            )}
          </div>
        </div>

        {/* Name */}
        <div className={`${columns[1]?.width} flex-shrink-0 px-2`}>
          <input
            type="text"
            value={fields.elementName || ""}
            onChange={(e) =>
              handleChange({ field: "elementName", value: e.target.value })
            }
            className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
            placeholder="Piece Name"
          />
        </div>

        {/* ID */}
        <div className={`${columns[2]?.width} flex-shrink-0 px-2`}>
          <input
            type="text"
            value={fields.elementId || ""}
            onChange={(e) =>
              handleChange({ field: "elementId", value: e.target.value })
            }
            className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
            placeholder="Piece ID"
          />
        </div>

        {/* Color */}
        <div
          className={`${columns[3]?.width} flex-shrink-0 px-2 relative`}
          ref={colorContainerRef}
          key="colorContainer"
        >
          <div
            className="flex items-center w-full bg-transparent border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-700/30 px-3 py-2 rounded-md text-slate-200 cursor-pointer transition-colors duration-150"
            onClick={() => setShowColorDropdown(!showColorDropdown)}
          >
            <div
              style={getColorStyle(fields.elementColor)}
              className="w-5 h-5 rounded-full mr-2"
            />
            <span className="truncate flex-1">
              {fields.elementColor || "Select color"}
            </span>
            <div
              className={`transform transition-transform duration-100 ${
                showColorDropdown ? "rotate-180" : ""
              }`}
            >
              <ExpandMoreRounded className="h-5 w-5 text-slate-400" />
            </div>
          </div>

          {showColorDropdown && (
            <ColorDropdown
              availableColors={availableColors}
              ref={colorContainerRef}
              reactKey="desktop"
              setShow={setShowColorDropdown}
              handleChange={handleChange}
            />
          )}
        </div>

        {/* On Hand */}
        <div className={`${columns[4]?.width} flex-shrink-0 px-2`}>
          <input
            type="number"
            min="0"
            value={fields.elementQuantityOnHand || 0}
            onChange={(e) =>
              handleChange({
                field: "elementQuantityOnHand",
                value: e.target.value,
              })
            }
            className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150 text-center"
          />
        </div>

        {/* Required */}
        <div className={`${columns[5]?.width} flex-shrink-0 px-2`}>
          <input
            type="number"
            min="0"
            value={fields.elementQuantityRequired || 0}
            onChange={(e) =>
              handleChange({
                field: "elementQuantityRequired",
                value: e.target.value,
              })
            }
            className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150 text-center"
          />
        </div>

        {/* Complete Status */}
        <div
          className={`${columns[6]?.width} ${columns[6]?.className} flex-shrink-0 px-2 flex items-center justify-center`}
        >
          <div
            className={`px-4 py-1.5 text-sm rounded-full inline-flex items-center transition-colors duration-150 ${
              countComplete == null
                ? "bg-slate-600 text-slate-200"
                : countComplete
                ? "bg-emerald-200 text-emerald-900"
                : "bg-rose-200 text-rose-900"
            }`}
          >
            {countComplete == null ? "General" : countComplete ? "Yes" : "No"}
          </div>
        </div>

        {/* Actions */}
        <div
          className={`${columns[7]?.width} flex-shrink-0 px-2 flex justify-end gap-2`}
        >
          <button
            onClick={() => {
              setHighlighted(!highlighted);
              handleChange({
                field: "highlighted",
                value: !highlighted,
              });
            }}
            className={`p-1.5 rounded transition-colors duration-150 ${
              highlighted
                ? "bg-pink-500/30 text-pink-300 hover:bg-pink-500/40"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
            }`}
            title={highlighted ? "Remove highlight" : "Highlight piece"}
          >
            <BookmarkRounded className="h-5 w-5" fontSize="small" />
          </button>

          <button
            onClick={handleDeleteClick}
            className="p-1.5 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600/30 transition-colors duration-150"
            title="Delete piece"
          >
            <DeleteForever className="h-5 w-5" fontSize="small" />
          </button>
        </div>
      </div>
    </div>
  );
}
