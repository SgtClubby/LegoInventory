// src/app/Components/Table/PieceRow/Minifig/MinifigMobileView.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  BookmarkRounded,
  DeleteForever,
  RefreshRounded,
  ExpandMoreRounded,
} from "@mui/icons-material";
import PriceTrend from "./PriceTrend";

/**
 * Mobile view for minifig items in the table
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
 * @returns {React.ReactElement} The MinifigMobileView component
 */
export default function MinifigMobileView({
  piece,
  handleDeleteClick,
  handleChange,
  fields,
  LoadingOverlay,
  setHighlighted,
  highlighted,
  isUpdating,
}) {
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
    return "bg-slate-800/70 hover:bg-slate-700/50 border-slate-700/40";
  };

  return (
    <div
      key="MinifigMobileView"
      className="switch:hidden relative "
      style={{ zIndex: 1 }}
    >
      <div className="switch:hidden mx-1 my-2">
        {/* Header Card (Always Visible) */}
        <div
          className={` relative z-10 flex flex-col w-full cursor-pointer rounded-t-lg border-l-4 ${getRowStyle()} ${
            isExpanded
              ? "shadow-[0px_8px_16px_rgba(0,0,0,0.3)]"
              : "rounded-b-lg drop-shadow-xl/45"
          } transition-colors duration-150`}
          onClick={toggleExpanded}
          onMouseEnter={() => {
            if (!isExpanded) {
              setAnimationClass("animate-fadeIn");
            }
          }}
        >
          {LoadingOverlay}

          {/* Top Row with Image, Name and Toggle */}
          <div className="flex items-center p-4">
            <div className="h-16 w-16 bg-slate-700/80 rounded-lg overflow-hidden flex items-center justify-center mr-3 flex-shrink-0 relative">
              {fields.minifigImage ? (
                <img
                  src={fields.minifigImage}
                  alt={fields.minifigName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  {!piece?.invalid && piece.cacheIncomplete && (
                    <RefreshRounded
                      className={`h-6 w-6 text-slate-300 absolute cursor-pointer ${
                        isUpdating ? "animate-spin" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChange({
                          field: "minifigIdRebrickable",
                          value: fields.minifigIdRebrickable,
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

            <div className="flex-1 min-w-0">
              <div className="text-lg font-medium text-slate-200 mb-1 truncate">
                {fields.minifigName || "Unnamed Minifig"}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <div className="text-sm text-slate-400">
                  ID: {fields.minifigIdRebrickable || "N/A"}
                </div>
                <div className="text-sm text-slate-400">
                  Qty: {fields.minifigQuantity || 0}
                </div>
              </div>
            </div>

            <div className="ml-2 flex flex-col items-end">
              <ExpandMoreRounded
                className={`h-6 w-6 text-slate-400 transform transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {/* Price Summary Row - Always visible */}
          <div className="px-4 pb-3 flex justify-between text-sm border-t border-slate-700/30 pt-2">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">New (Avg)</span>
              <span className="font-medium text-slate-200 flex items-center">
                {fields.priceData?.avgPriceNew
                  ? `$${fields.priceData.avgPriceNew}`
                  : "N/A"}
                {fields.priceData?.trends?.avgPriceNew && (
                  <span className="ml-1">
                    <PriceTrend
                      trend={fields.priceData.trends.avgPriceNew}
                      size="small"
                    />
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">Used (Avg)</span>
              <span className="font-medium text-slate-200 flex items-center">
                {fields.priceData?.avgPriceUsed
                  ? `$${fields.priceData.avgPriceUsed}`
                  : "N/A"}
                {fields.priceData?.trends?.avgPriceUsed && (
                  <span className="ml-1">
                    <PriceTrend
                      trend={fields.priceData.trends.avgPriceUsed}
                      size="small"
                    />
                  </span>
                )}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHighlighted(!highlighted);
                  handleChange({
                    field: "highlighted",
                    value: !highlighted,
                  });
                }}
                className={`p-1 rounded ${
                  highlighted
                    ? "bg-pink-500/30 text-pink-300"
                    : "bg-slate-700/50 text-slate-400"
                }`}
              >
                <BookmarkRounded className="h-5 w-5" fontSize="small" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                className="p-1 bg-rose-600/20 text-rose-400 rounded"
              >
                <DeleteForever className="h-5 w-5" fontSize="small" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Section */}
        {(isExpanded || animationClass.includes("animate-slideUp")) && (
          <div
            className={`relative z-0 bg-gradient-to-b from-slate-800/60 to-slate-700/60 backdrop-blur-xl border-l-4 border-r border-b rounded-b-lg px-4 py-4 space-y-4 border-slate-700/40 ${animationClass}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
            style={{
              zIndex: 0,
              animationDuration: "300ms",
              pointerEvents: animationClass.includes("animate-slideUp")
                ? "none"
                : "auto",
            }}
            ref={dropdownRef}
          >
            {/* Name Field */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={fields.minifigName || ""}
                onChange={(e) =>
                  handleChange({ field: "minifigName", value: e.target.value })
                }
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
                placeholder="Minifig Name"
              />
            </div>

            {/* IDs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Rebrickable ID
                </label>
                <input
                  type="text"
                  value={fields.minifigIdRebrickable || ""}
                  onChange={(e) =>
                    handleChange({
                      field: "minifigIdRebrickable",
                      value: e.target.value,
                    })
                  }
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
                  placeholder="e.g., fig-001234"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Bricklink ID
                </label>
                <input
                  type="text"
                  value={fields.minifigIdBricklink || ""}
                  onChange={(e) =>
                    handleChange({
                      field: "minifigIdBricklink",
                      value: e.target.value,
                    })
                  }
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
                  placeholder="e.g., sw0001"
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="0"
                value={fields.minifigQuantity || 0}
                onChange={(e) =>
                  handleChange({
                    field: "minifigQuantity",
                    value: e.target.value,
                  })
                }
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
              />
            </div>

            {/* Price Details */}
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">
                Price Information
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/30 rounded-md p-3">
                  <div className="text-xs font-medium text-blue-400 mb-2">
                    New
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Max:</span>
                      <span className="text-xs text-slate-200 flex items-center">
                        {fields.priceData?.maxPriceNew
                          ? `$${fields.priceData.maxPriceNew}`
                          : "N/A"}
                        {fields.priceData?.trends?.maxPriceNew && (
                          <span className="ml-1">
                            <PriceTrend
                              trend={fields.priceData.trends.maxPriceNew}
                              size="small"
                            />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Avg:</span>
                      <span className="text-xs text-slate-200 flex items-center">
                        {fields.priceData?.avgPriceNew
                          ? `$${fields.priceData.avgPriceNew}`
                          : "N/A"}
                        {fields.priceData?.trends?.avgPriceNew && (
                          <span className="ml-1">
                            <PriceTrend
                              trend={fields.priceData.trends.avgPriceNew}
                              size="small"
                            />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Min:</span>
                      <span className="text-xs text-slate-200 flex items-center">
                        {fields.priceData?.minPriceNew
                          ? `$${fields.priceData.minPriceNew}`
                          : "N/A"}
                        {fields.priceData?.trends?.minPriceNew && (
                          <span className="ml-1">
                            <PriceTrend
                              trend={fields.priceData.trends.minPriceNew}
                              size="small"
                            />
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-md p-3">
                  <div className="text-xs font-medium text-blue-400 mb-2">
                    Used
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Max:</span>
                      <span className="text-xs text-slate-200 flex items-center">
                        {fields.priceData?.maxPriceUsed
                          ? `$${fields.priceData.maxPriceUsed}`
                          : "N/A"}
                        {fields.priceData?.trends?.maxPriceUsed && (
                          <span className="ml-1">
                            <PriceTrend
                              trend={fields.priceData.trends.maxPriceUsed}
                              size="small"
                            />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Avg:</span>
                      <span className="text-xs text-slate-200 flex items-center">
                        {fields.priceData?.avgPriceUsed
                          ? `$${fields.priceData.avgPriceUsed}`
                          : "N/A"}
                        {fields.priceData?.trends?.avgPriceUsed && (
                          <span className="ml-1">
                            <PriceTrend
                              trend={fields.priceData.trends.avgPriceUsed}
                              size="small"
                            />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Min:</span>
                      <span className="text-xs text-slate-200 flex items-center">
                        {fields.priceData?.minPriceUsed
                          ? `$${fields.priceData.minPriceUsed}`
                          : "N/A"}
                        {fields.priceData?.trends?.minPriceUsed && (
                          <span className="ml-1">
                            <PriceTrend
                              trend={fields.priceData.trends.minPriceUsed}
                              size="small"
                            />
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
