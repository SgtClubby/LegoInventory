// src/app/Components/Table/PieceRow/MinifigDesktopView.jsx
import React, { useState, useRef, useEffect } from "react";

import {
  BookmarkRounded,
  DeleteForever,
  RefreshRounded,
} from "@mui/icons-material";

export default function MinifigDesktopView({
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
        </div>

        {/* Name */}
        <div className={`${columns[1]?.width} flex-shrink-0 px-2`}>
          <input
            type="text"
            value={fields.minifigName || ""}
            onChange={(e) =>
              handleChange({ field: "minifigName", value: e.target.value })
            }
            className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
          />
        </div>

        {/* ID */}
        <div className={`${columns[2]?.width} flex-shrink-0 px-2`}>
          <input
            type="text"
            value={fields.minifigId || ""}
            onChange={(e) =>
              handleChange({ field: "minifigId", value: e.target.value })
            }
            className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
          />
        </div>

        {/* Price Info (instead of color) */}
        <div className={`${columns[3]?.width} flex-shrink-0 px-2`}>
          <div className="flex flex-col w-full bg-transparent border border-transparent px-2 py-1.5 rounded text-slate-200">
            <span className="text-xs text-slate-400">
              Avg: {fields.priceData?.avgPrice || "N/A"}
            </span>
            <span className="text-xs text-slate-400">
              Min: {fields.priceData?.minPrice || "N/A"}
            </span>
          </div>
        </div>

        {/* On Hand */}
        <div className={`${columns[4]?.width} flex-shrink-0 px-2`}>
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
            className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
          />
        </div>

        {/* Required */}
        <div className={`${columns[5]?.width} flex-shrink-0 px-2`}>
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
