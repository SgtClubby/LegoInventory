// src/app/Components/Table/PieceRow/Piece/PieceMobileView.jsx
import getColorStyle from "@/lib/Misc/getColorStyle";
import React, { useState, memo, useRef, useEffect, useCallback } from "react";

import {
  BookmarkRounded,
  DeleteForever,
  ExpandMoreRounded,
  RefreshRounded,
} from "@mui/icons-material";
import ColorDropdown from "../ColorDropdown";

export default function PieceMobileView({
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
  const { piece } = originalProps;

  const { elementColorId, availableColors } = piece;

  const colorContainerRef = useRef(null);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const dropdownRef = useRef(null);

  const toggleExpanded = () => {
    if (isExpanded) {
      // When closing, first trigger the closing animation
      setAnimationClass("animate-slideUp animate-fadeOut");
      // After animation completes, actually collapse the content
      setTimeout(() => {
        setIsExpanded(false);
        setAnimationClass("");
      }, 280); // Duration slightly less than the animation to ensure smooth transition
    } else {
      // When opening, show the content and add opening animation classes
      setIsExpanded(true);
      setAnimationClass("animate-slideDown animate-fadeIn");
    }
  };

  // Handle outside click for color dropdown on mobile
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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        toggleExpanded();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const getRowStyle = () => {
    if (highlighted)
      return "bg-pink-900/40 hover:bg-pink-800/40 border-pink-700/30";
    if (countComplete)
      return "bg-emerald-900/30 hover:bg-emerald-800/30 border-emerald-700/30";
    return "bg-slate-800/70 hover:bg-slate-700/50 border-slate-700/40";
  };

  return (
    <div
      key="PieceMobileView"
      className="switch:hidden relative"
      style={{ zIndex: 1 }}
    >
      {/* Mobile Card Header - Always visible */}
      <div
        className={`relative z-10 flex items-center justify-between ${getRowStyle()} rounded-t-lg border-l-4 ${
          isExpanded
            ? "shadow-[0px_8px_16px_rgba(0,0,0,0.3)]"
            : "rounded-b-lg drop-shadow-xl/45"
        } transition-colors duration-200 cursor-pointer px-4 py-3 mx-1 my-1`}
        onClick={toggleExpanded}
        onMouseEnter={() => {
          if (!isExpanded) {
            setAnimationClass("animate-fadeIn");
          }
        }}
      >
        {LoadingOverlay}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-12 w-12 bg-slate-700 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
            {availableColors?.find((color) => color.colorId == elementColorId)
              ?.elementImage ? (
              <img
                src={
                  availableColors.find(
                    (color) => color.colorId == elementColorId
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

          <div className="min-w-0 truncate">
            <div className="font-medium text-slate-200 truncate">
              {fields.elementName}
            </div>
            <div className="text-sm text-slate-400 truncate">
              {fields.elementId} • {fields.elementColor}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 pl-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Count</div>
            <div
              className={`font-medium ${
                countComplete ? "text-emerald-400" : "text-slate-200"
              }`}
            >
              {fields.elementQuantityOnHand}/{fields.elementQuantityRequired}
            </div>
          </div>

          <div
            className={`transform transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <ExpandMoreRounded className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Mobile Expanded View - Only visible when expanded */}
      {(isExpanded || animationClass.includes("animate-slideUp")) && (
        <div
          className={`relative z-0 mx-1 -m-2 bg-gradient-to-b from-slate-800/60 to-slate-700/60 backdrop-blur-xl rounded-b-lg border border-t-0 border-slate-600/50 shadow-lg overflow-hidden p-5 ${animationClass}`}
          style={{
            zIndex: 0,
            animationDuration: "300ms",
            pointerEvents: animationClass.includes("animate-slideUp")
              ? "none"
              : "auto",
          }}
          ref={dropdownRef}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="grid grid-cols-1 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={fields.elementName || ""}
                onChange={(e) => {
                  handleChange({
                    field: "elementName",
                    value: e.target.value,
                  });
                }}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
              />
            </div>

            {/* ID */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">ID</label>
              <input
                type="text"
                value={fields.elementId || ""}
                onChange={(e) => {
                  handleChange({
                    field: "elementId",
                    value: e.target.value,
                  });
                }}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
              />
            </div>

            {/* Color */}
            <div
              key="colorContainer"
              className="relative"
              ref={colorContainerRef}
            >
              <label className="block text-xs text-slate-400 mb-1">Color</label>
              <div
                className="flex items-center w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200 cursor-pointer"
                onClick={() => setShowColorDropdown(!showColorDropdown)}
              >
                {fields.elementColor ? (
                  <>
                    <div
                      style={getColorStyle(fields.elementColor)}
                      className="w-5 h-5 rounded-full mr-2"
                    />
                    <span>{fields.elementColor}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Select color</span>
                )}

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
                  reactKey="mobile"
                  setShow={setShowColorDropdown}
                  handleChange={handleChange}
                />
              )}
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  On Hand
                </label>
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
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Required
                </label>
                <input
                  type="number"
                  min="0"
                  value={fields.elementQuantityRequired || "0"}
                  onChange={(e) =>
                    handleChange({
                      field: "elementQuantityRequired",
                      value: e.target.value,
                    })
                  }
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-700/30">
              <button
                onClick={() => {
                  setHighlighted(!highlighted);
                  handleChange({
                    field: "highlighted",
                    value: !highlighted,
                  });
                }}
                className={`flex items-center px-3 py-1.5 rounded transition-colors duration-150 ${
                  highlighted
                    ? "bg-pink-500/30 text-pink-300"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                }`}
                title={highlighted ? "Remove highlight" : "Highlight piece"}
              >
                <BookmarkRounded className="h-5 w-5 mr-1" fontSize="small" />
                {highlighted ? "Remove highlight" : "Highlight piece"}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                className="flex items-center px-3 py-1.5 bg-rose-600/20 text-rose-400 rounded-md hover:bg-rose-600/30 transition-colors"
              >
                <DeleteForever className="h-5 w-5 mr-1" fontSize="small" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
