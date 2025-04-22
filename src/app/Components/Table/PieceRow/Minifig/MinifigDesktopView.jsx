// src/app/Components/Table/PieceRow/Minifig/MinifigDesktopView.jsx
import React from "react";

import {
  BookmarkRounded,
  DeleteForever,
  RefreshRounded,
} from "@mui/icons-material";

import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import PriceTrend from "./PriceTrend";

/**
 * Desktop view for minifig items in the table with improved responsiveness
 *
 * @param {Object} originalProps - Original props passed from parent
 * @param {Function} handleDeleteClick - Function to handle delete action
 * @param {Function} handleChange - Function to handle field changes
 * @param {Object} fields - Current field values
 * @param {React.ReactNode} LoadingOverlay - Loading overlay component
 * @param {Function} setHighlighted - Function to toggle highlighted state
 * @param {boolean} highlighted - Whether the item is highlighted
 * @param {boolean} isUpdating - Whether the item is currently updating
 * @returns {React.ReactElement} The MinifigDesktopView component
 */
export default function MinifigDesktopView({
  originalProps,
  handleDeleteClick,
  handleChange,
  fields,
  LoadingOverlay,
  setHighlighted,
  highlighted,
  isUpdating,
}) {
  const { piece, columns } = originalProps;

  const getRowStyle = () => {
    if (highlighted)
      return "bg-pink-900/40 hover:bg-pink-800/40 border-pink-700/30";
    return "bg-slate-800/70 hover:bg-slate-700/50 border-slate-700/40";
  };

  return (
    <div className="animate-slideDown">
      <div
        key="desktop"
        className={`hidden switch:flex items-center w-full px-2 py-2 mx-1 my-1 rounded-lg border-l-4 ${getRowStyle()} transition-colors duration-150 drop-shadow-xl/45`}
      >
        {LoadingOverlay}

        {/* Image - Fixed width that doesn't shrink too much */}
        <div
          className={`${columns[0]?.width} flex-shrink-0 flex justify-center px-2`}
          style={{ minWidth: "80px" }}
        >
          <div className="h-16 w-16 bg-slate-700/80 rounded-lg overflow-hidden flex items-center justify-center relative">
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
                    onClick={() => {
                      handleChange({
                        field: "minifigIdRebrickable",
                        value: fields.minifigIdRebrickable,
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

        {/* Name - Allow shrinking but maintain readability */}
        <div
          className={`${columns[1]?.width} px-2 flex-shrink`}
          style={{ minWidth: "120px" }}
        >
          <input
            type="text"
            value={fields.minifigName || ""}
            onChange={(e) =>
              handleChange({ field: "minifigName", value: e.target.value })
            }
            className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
            placeholder="Minifig Name"
          />
        </div>

        {/* IDs - Can shrink but maintains minimum width */}
        <div
          className={`${columns[2]?.width} flex-shrink px-2`}
          style={{ minWidth: "140px" }}
        >
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Rebrickable ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fields.minifigIdRebrickable || ""}
                  onChange={(e) =>
                    handleChange({
                      field: "minifigIdRebrickable",
                      value: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-1.5 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150 pr-8"
                  placeholder="e.g., fig-001234"
                />
                <div className="absolute right-2 top-[17px] transform -translate-y-1/2 text-slate-400">
                  <LaunchRoundedIcon
                    className="cursor-pointer text-blue-400 hover:text-blue-300"
                    onClick={() => {
                      window.open(
                        `https://rebrickable.com/minifigs/${fields.minifigIdRebrickable}/`,
                        "_blank"
                      );
                    }}
                    title="Open Rebrickable"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Bricklink ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fields.minifigIdBricklink || ""}
                  onChange={(e) =>
                    handleChange({
                      field: "minifigIdBricklink",
                      value: e.target.value,
                    })
                  }
                  className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-1.5 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150 pr-8"
                  placeholder="e.g., sw0001"
                />
                <div className="absolute right-2 top-[17px] transform -translate-y-1/2">
                  <LaunchRoundedIcon
                    className="cursor-pointer text-blue-400 hover:text-blue-300"
                    onClick={() => {
                      window.open(
                        `https://www.bricklink.com/v2/catalog/catalogitem.page?M=${fields.minifigIdBricklink}`,
                        "_blank"
                      );
                    }}
                    title="Open Bricklink"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Info - Can shrink with screen size but maintains layout */}
        <div
          className={`${columns[3]?.width} flex-1 px-2`}
          style={{ minWidth: "200px" }}
        >
          <div className="flex w-full">
            <div className="w-1/2 pr-2">
              <div className="text-sm font-medium text-blue-400 mb-1 ml-2">
                New
              </div>
              <div className="space-y-1 bg-slate-800/50 rounded-md p-2 border border-slate-700/30">
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
                  <span className="text-xs font-medium text-slate-200 flex items-center">
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
            <div className="w-1/2 pl-2">
              <div className="text-sm font-medium text-blue-400 mb-1 ml-2">
                Used
              </div>
              <div className="space-y-1 bg-slate-800/50 rounded-md p-2 border border-slate-700/30">
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
                  <span className="text-xs font-medium text-slate-200 flex items-center">
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

        {/* Quantity - Fixed width that doesn't change */}
        <div
          className={`${columns[4]?.width} flex-shrink-0 px-2`}
          style={{ width: "80px", minWidth: "80px" }}
        >
          <label className="text-xs text-slate-400 block mb-1 text-center">
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
            className="w-full bg-transparent border border-slate-700/50 focus:border-blue-500/50 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700/30 transition-colors duration-150 text-center"
          />
        </div>

        {/* Actions - Fixed width that doesn't change */}
        <div
          className={`${columns[5]?.width} flex-shrink-0 px-2 flex justify-end gap-2`}
          style={{ width: "90px", minWidth: "90px" }}
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
            title={highlighted ? "Remove highlight" : "Highlight minifig"}
          >
            <BookmarkRounded className="h-5 w-5" fontSize="small" />
          </button>

          <button
            onClick={handleDeleteClick}
            className="p-1.5 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600/30 transition-colors duration-150"
            title="Delete minifig"
          >
            <DeleteForever className="h-5 w-5" fontSize="small" />
          </button>
        </div>
      </div>
    </div>
  );
}
