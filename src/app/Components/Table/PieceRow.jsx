// src/app/components/Table/PieceRow.jsx

import React, { useState, useEffect } from "react";

// Functions
import colors from "@/Colors/colors.js";
import getColorStyle from "@/lib/Misc/getColorStyle";
import useBreakpoint from "@/hooks/useBreakpoint";

//Icons
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PieceImage from "./PieceRowColumns/PieceImage";
import PieceName from "./PieceRowColumns/PieceName";
import PieceID from "./PieceRowColumns/PieceID";
import PieceColor from "./PieceRowColumns/PieceColor";
import PieceInventory from "./PieceRowColumns/PieceInventory";
import PieceCompleted from "./PieceRowColumns/PeiceComplete";
import PieceActions from "./PieceRowColumns/PieceActions";

const PieceRow = ({
  piece,
  onChange,
  onDelete,
  originalId,
  columnWidths,
  virtualizer,
  rowOptions,
  index,
}) => {
  const {
    elementId,
    elementName,
    elementColor,
    elementQuantityOnHand,
    elementQuantityRequired,
    countComplete,
  } = piece;

  const { isSm, isMd, isLg, isXl } = useBreakpoint();
  const [highlighted, setHighlighted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // This helps update the virtualizer when a row expands
  useEffect(() => {
    if (virtualizer && typeof index === "number") {
      virtualizer.measure();
    }
  }, [isExpanded, virtualizer, index]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const colBase = `h-16 border-b border-gray-700 py-3 px-4 text-sm md:text-md text-gray-200 flex items-center justify-center flex-shrink-0 relative`;

  // Mobile view with dropdown

  // Desktop view with inline editing
  const desktopView = (
    <div
      className={`hidden md:inline-flex items-center w-full ${
        countComplete
          ? "bg-green-900 hover:bg-green-800"
          : highlighted
          ? "bg-pink-900 hover:bg-pink-800"
          : "bg-slate-900 hover:bg-slate-800"
      } transition duration-200`}
    >
      <PieceImage
        piece={piece}
        colBase={colBase}
        columnWidths={columnWidths}
        onChange={onChange}
        originalId={originalId}
      />
      <PieceName
        piece={piece}
        colBase={colBase}
        columnWidths={columnWidths}
        onChange={onChange}
        originalId={originalId}
      />
      <PieceID
        piece={piece}
        colBase={colBase}
        columnWidths={columnWidths}
        onChange={onChange}
        originalId={originalId}
      />
      <PieceColor
        piece={piece}
        colBase={colBase}
        columnWidths={columnWidths}
        onChange={onChange}
        originalId={originalId}
      />
      <PieceInventory
        piece={piece}
        colBase={colBase}
        columnWidths={columnWidths}
        onChange={onChange}
        originalId={originalId}
      />
      <PieceCompleted
        piece={piece}
        colBase={colBase}
        columnWidths={columnWidths}
        onChange={onChange}
        originalId={originalId}
      />
      <PieceActions
        colBase={colBase}
        columnWidths={columnWidths}
        onDelete={onDelete}
        highlighted={highlighted}
        setHighlighted={setHighlighted}
        originalId={originalId}
      />
    </div>
  );

  const mobileView = (
    <>
      <div
        className={`md:hidden flex items-center justify-between w-full ${
          countComplete
            ? "bg-green-900"
            : highlighted
            ? "bg-pink-900"
            : "bg-slate-900"
        } hover:bg-slate-800 transition duration-200 cursor-pointer`}
        onClick={toggleExpand}
      >
        <div className="flex items-center">
          <PieceImage
            piece={piece}
            colBase={colBase}
            columnWidths={columnWidths}
            onChange={onChange}
            originalId={originalId}
          />
          <div className="flex flex-col">
            <span className="font-medium text-gray-200">{elementName}</span>
            <span className="text-sm text-gray-300 opacity-75">
              {elementColor}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="mr-3 text-sm text-gray-200">
            {elementQuantityOnHand}/{elementQuantityRequired}
          </div>
          {isExpanded ? (
            <ExpandLessIcon className="text-gray-200" />
          ) : (
            <ExpandMoreIcon className="text-gray-200" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="md:hidden bg-slate-800 px-4 py-4 border-b border-gray-700 mb-3">
          <div className="grid grid-cols-1 gap-4 text-gray-100">
            <div className="flex items-center">
              <label className="mr-2 text-gray-200 w-1/3">Name:</label>
              <input
                type="text"
                value={elementName}
                onChange={(e) =>
                  onChange("elementName", originalId, e.target.value)
                }
                className="w-2/3 bg-slate-700 border border-gray-700 rounded px-2 py-1 focus:border-blue-500 focus:ring-0 text-gray-200"
              />
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-gray-200 w-1/3">ID:</label>
              <div className="flex w-2/3">
                <input
                  type="text"
                  value={elementId}
                  onChange={(e) =>
                    onChange("elementId", originalId, e.target.value || 0)
                  }
                  className="flex-1 bg-slate-700 border border-gray-700 rounded px-2 py-1 focus:border-blue-500 focus:ring-0 text-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-gray-200 w-1/3">Color:</label>
              <div className="flex items-center w-2/3">
                <div
                  style={getColorStyle(elementColor)}
                  className="mr-2 w-6 h-6 rounded-full"
                ></div>
                <select
                  value={elementColor}
                  onChange={(e) =>
                    onChange("elementColor", originalId, e.target.value)
                  }
                  className="bg-slate-700 border border-gray-700 rounded px-2 py-1 focus:border-blue-500 focus:ring-0 text-gray-200 w-full"
                >
                  {colors.map((color) => (
                    <option
                      key={color.colorName}
                      className="bg-slate-800"
                      value={color.colorName}
                    >
                      {color.colorName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-gray-200 w-1/3">
                Quantity on hand:
              </label>
              <input
                type="number"
                min="0"
                value={elementQuantityOnHand}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value) || 0;
                  const willBeComplete =
                    elementQuantityRequired !== 0 &&
                    newValue >= elementQuantityRequired;
                  if (willBeComplete) e.target.blur();
                  onChange("elementQuantityOnHand", originalId, newValue);
                }}
                className="w-20 bg-slate-700 border border-gray-700 rounded px-2 py-1 focus:border-blue-500 focus:ring-0 text-gray-200"
              />
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-gray-200 w-1/3">
                Quantity required:
              </label>
              <input
                type="number"
                min="0"
                value={elementQuantityRequired}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value) || 0;
                  const willBeComplete =
                    elementQuantityOnHand !== 0 &&
                    newValue <= elementQuantityOnHand;
                  if (willBeComplete) e.target.blur();
                  onChange("elementQuantityRequired", originalId, newValue);
                }}
                className="w-20 bg-slate-700 border border-gray-700 rounded px-2 py-1 focus:border-blue-500 focus:ring-0 text-gray-200"
              />
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-gray-200 w-1/3">Complete:</label>
              <div
                className={`text-sm w-fit px-2 py-1 rounded-full inline-flex items-center ${
                  countComplete == null
                    ? "bg-gray-100"
                    : countComplete
                    ? "bg-green-200 text-green-800"
                    : "bg-red-200 text-red-800"
                }`}
              >
                {countComplete == null
                  ? "General"
                  : countComplete
                  ? "Yes"
                  : "No"}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="w-5 h-5 mr-2"
                  checked={highlighted}
                  onChange={(e) => setHighlighted(e.target.checked)}
                />
                <label className="text-gray-200">Highlight</label>
              </div>
              <button
                onClick={() => onDelete(originalId)}
                className="text-red-500 hover:text-red-700 px-3 py-1 rounded bg-red-900/30 hover:bg-red-900/50 transition duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {mobileView}
      {desktopView}
    </>
  );
};

// Preserve memoization with proper comparison
function areEqual(prevProps, nextProps) {
  return (
    prevProps.piece === nextProps.piece &&
    prevProps.base64image === nextProps.base64image &&
    prevProps.isExpanded === nextProps.isExpanded
  );
}

export default React.memo(PieceRow, areEqual);
