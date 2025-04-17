// src/app/Components/Table/PieceRow/MinifigMobileView.jsx
import React from "react";
import {
  BookmarkRounded,
  DeleteForever,
  RefreshRounded,
} from "@mui/icons-material";

export default function MinifigMobileView({
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
        className={`switch:hidden flex flex-col sm:flex-row justify-between w-full p-4 mx-1 my-2 rounded-lg border-l-4 relative ${getRowStyle()}`}
      >
        {LoadingOverlay}

        {/* Left side with image and name */}
        <div className="flex-1 flex items-center mb-4 sm:mb-0">
          <div className="h-14 w-14 bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center mr-3">
            {fields.minifigImage ? (
              <img
                src={fields.minifigImage}
                alt={fields.minifigName}
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
                        field: "minifigId",
                        value: fields.minifigId,
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

          <div className="flex flex-col flex-1">
            <div className="text-lg font-medium text-slate-200 mb-1 truncate">
              {fields.minifigName || "Unnamed Minifig"}
            </div>
            <div className="text-sm text-slate-400">ID: {fields.minifigId}</div>
            <div className="flex gap-2 mt-1 text-sm text-slate-400">
              <span>Avg: {fields.priceData?.avgPrice || "N/A"}</span>
              <span>Min: {fields.priceData?.minPrice || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Right side with counts */}
        <div className="flex items-center justify-between sm:flex-col sm:justify-center sm:items-end">
          <div className="flex items-center gap-4">
            {/* On Hand Count */}
            <div className="flex flex-col items-center">
              <label className="text-xs text-slate-400 mb-1">Have</label>
              <input
                type="number"
                min="0"
                value={fields.minifigQuantityOnHand || 0}
                onChange={(e) =>
                  handleChange({
                    field: "minifigQuantityOnHand",
                    value: e.target.value,
                  })
                }
                className="w-14 p-1 bg-transparent border border-slate-600 rounded text-center text-slate-200"
              />
            </div>

            {/* Required Count */}
            <div className="flex flex-col items-center">
              <label className="text-xs text-slate-400 mb-1">Need</label>
              <input
                type="number"
                min="0"
                value={fields.minifigQuantityRequired || 0}
                onChange={(e) =>
                  handleChange({
                    field: "minifigQuantityRequired",
                    value: e.target.value,
                  })
                }
                className="w-14 p-1 bg-transparent border border-slate-600 rounded text-center text-slate-200"
              />
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center gap-2 mt-4">
            {/* Complete Status */}
            <div
              className={`px-2 py-1 text-xs rounded-full ${
                countComplete == null
                  ? "bg-slate-600 text-slate-200"
                  : countComplete
                  ? "bg-emerald-200 text-emerald-900"
                  : "bg-rose-200 text-rose-900"
              }`}
            >
              {countComplete == null
                ? "General"
                : countComplete
                ? "Complete"
                : "Incomplete"}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => {
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
                onClick={handleDeleteClick}
                className="p-1 bg-rose-600/20 text-rose-400 rounded"
              >
                <DeleteForever className="h-5 w-5" fontSize="small" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
