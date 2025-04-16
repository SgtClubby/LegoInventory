// src/app/Components/Table/PieceRow/DesktopView.jsx
import getColorStyle from "@/lib/Misc/getColorStyle";
import React, { useState, memo, useRef, useEffect, useCallback } from "react";

import {
  BookmarkRounded,
  DeleteForever,
  ExpandMoreRounded,
  RefreshRounded,
} from "@mui/icons-material";
import ColorDropdown from "./ColorDropdown";

export default function DesktopView({
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
  const { piece, columns, isLast = false, selectedTable } = originalProps;

  // Use fields instead of piece for most display, but keep piece.availableColors and elementColorId
  // since those are used for the color dropdown logic
  const { availableColors } = piece;

  const colorContainerRef = useRef(null);
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        colorContainerRef.current &&
        !colorContainerRef.current.contains(event.target) &&
        showColorDropdown
      ) {
        setShowColorDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [colorContainerRef]);

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
        className={`hidden switch:flex items-center w-full px-2 py-1 mx-1 my-1 ${
          isLast ? "mb-4" : null
        } rounded-lg border-l-4 ${getRowStyle()}`}
      >
        {LoadingOverlay}

        {/* Image */}
        <div
          className={`${columns[0]?.width} flex-shrink-0 flex justify-center px-2`}
        >
          <div className="h-12 w-12 bg-slate-700 rounded overflow-hidden flex items-center justify-center">
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
                    className={`h-6 w-6 text-slate-300 absolute cursor-pointer pointer-events-auto ${
                      isUpdating ? "animate-spin" : ""
                    }`}
                    onClick={() => {
                      handleChange({
                        field: "elementId",
                        value: fields.elementId,
                      });
                    }}
                    title="refresh image"
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
            className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
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
            className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
          />
        </div>

        {/* Color */}
        <div
          className={`${columns[3]?.width} flex-shrink-0 px-2 relative`}
          ref={colorContainerRef}
          key="colorContainer"
        >
          <div
            className="flex items-center w-full bg-transparent border border-transparent hover:border-slate-600 hover:bg-slate-700/30 px-2 py-1.5 rounded text-slate-200 cursor-pointer transition-colors duration-150"
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
            className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
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
            className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
          />
        </div>

        {/* Complete Status */}
        <div
          className={`${columns[6]?.width} ${columns[6]?.className} flex-shrink-0 px-2 flex`}
        >
          <div
            className={`px-3 py-1 text-sm rounded-full inline-flex items-center transition-colors duration-150 ${
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
          className={`${columns[7]?.width} flex-shrink-0 px-2 flex 2xl:justify-end gap-2`}
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
                ? "bg-pink-500/30 text-pink-300"
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
