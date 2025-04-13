// src/app/Components/Table/PieceRow.jsx
import React, { useState, memo, useRef, useEffect } from "react";
import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/Colors/colors.js";

/**
 * Component that renders a single piece row in both mobile and desktop views
 *
 * @param {Object} piece - The piece data object
 * @param {Function} onChange - Function to handle changes to piece properties
 * @param {Function} onDelete - Function to handle piece deletion
 * @param {string} originalId - The unique ID of the piece
 * @param {boolean} isUpdating - Whether the piece is currently being updated
 * @param {number} index - The index of the piece in the list
 * @param {boolean} isLast - Whether this is the last piece in the list
 * @returns {JSX.Element} The rendered piece row
 */
const PieceRow = ({
  piece,
  onChange,
  onDelete,
  originalId,
  isUpdating = false,
  index,
  columns,
  isLast = false,
}) => {
  const {
    elementId,
    elementName,
    elementColor,
    elementColorId,
    elementQuantityOnHand,
    elementQuantityRequired,
    countComplete,
    availableColors,
  } = piece;

  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [highlighted, setHighlighted] = useState(piece.highlighted);
  const [isExpanded, setIsExpanded] = useState(false);
  const colorDropdownRef = useRef(null);
  const mobileColorContainerRef = useRef(null);
  const desktopColorContainerRef = useRef(null);
  // Handle outside click for color dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target)
      ) {
        setShowColorDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [colorDropdownRef]);

  /**
   * Renders the color dropdown component
   *
   * @param {boolean} isMobile - Whether the dropdown is in mobile view
   * @returns {JSX.Element} The color dropdown component
   */
  const ColorDropdown = ({ isMobile }) => {
    const colorOptions =
      availableColors && availableColors.length > 0
        ? colors.filter((c) =>
            availableColors.some(
              (apc) => String(apc.colorId) === String(c.colorId)
            )
          )
        : colors;

    // Use different positioning classes for mobile vs desktop
    const positionClasses = isMobile
      ? "absolute z-60 top-full left-0 mt-1" // Position below the parent for mobile
      : "absolute z-60 top-14 left-0"; // Original positioning for desktop

    return (
      <div
        ref={colorDropdownRef}
        key={isMobile ? "mobile" : "desktop"}
        className={`${positionClasses} w-56 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-md shadow-xl animate-fadeIn animate-slideDown`}
      >
        <div className="py-1 divide-y divide-slate-700">
          {colorOptions.map((color) => (
            <div
              key={
                isMobile
                  ? `mobile-${color.colorId}`
                  : `desktop-${color.colorId}`
              }
              className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer transition-colors duration-150"
              onClick={() => {
                onChange(originalId, "elementColor", color.colorName);
                setShowColorDropdown(false);
              }}
            >
              <div
                style={getColorStyle(color.colorName)}
                className="w-5 h-5 rounded-full mr-2"
              />
              <span className="text-slate-200 text-sm">{color.colorName}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Gets the row style based on completion and highlight status
   *
   * @returns {string} CSS class string for row styling
   */
  const getRowStyle = () => {
    if (highlighted)
      return "bg-pink-900/40 hover:bg-pink-800/40 border-pink-700/30";
    if (countComplete)
      return "bg-emerald-900/30 hover:bg-emerald-800/30 border-emerald-700/30";
    return "bg-slate-800/70 hover:bg-slate-700/50 border-slate-700/40";
  };

  /**
   * Handles changes to quantity fields
   *
   * @param {string} field - The field to update
   * @param {string|number} value - The new value
   */
  const handleQuantityChange = (field, value) => {
    const parsedValue = parseInt(value, 10) || 0;
    onChange(originalId, field, parsedValue);
  };

  // When user scrolls a certain distance, like 100px, the row will be collapsed if it's expanded
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 800 && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isExpanded]);

  // Loading overlay
  const LoadingOverlay = isUpdating ? (
    <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] pointer-events-none z-10 flex items-center justify-center">
      <div className="h-5 w-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
    </div>
  ) : null;

  /**
   * Handles delete button click with confirmation
   */
  const handleDeleteClick = () => {
    onDelete(originalId);
  };

  /**
   * Toggles the expanded view for mobile
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  /**
   * Mobile view component
   *
   * @returns {JSX.Element} The mobile view
   */
  const MobileView = () => (
    <div key="MobileView" className="switch:hidden">
      {/* Mobile Card Header - Always visible */}
      <div
        className={`relative flex items-center justify-between p-6 ${getRowStyle()} rounded-t-lg border-l-4 ${
          isExpanded ? "" : "rounded-b-lg"
        } transition-colors duration-200 cursor-pointer px-2 py-1 mx-1 my-1`}
        onClick={toggleExpanded}
      >
        {LoadingOverlay}

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-slate-700 rounded overflow-hidden flex items-center justify-center">
            {availableColors?.find((color) => color.colorId == elementColorId)
              ?.elementImage ? (
              <img
                src={
                  availableColors.find(
                    (color) => color.colorId == elementColorId
                  ).elementImage
                }
                alt={elementName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-500">No image</span>
            )}
          </div>

          <div className="min-w-0 max-w-[calc(100%-3rem)] flex-1 truncate">
            <div className="font-medium text-slate-200 truncate">
              {elementName}
            </div>
            <div className="text-sm text-slate-400 truncate">
              {elementId} • {elementColor}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 absolute z-20 right-0 px-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Count</div>
            <div className="text-slate-200 font-medium">
              {elementQuantityOnHand}/{elementQuantityRequired}
            </div>
          </div>

          <div
            className={`transform transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Mobile Expanded View - Only visible when expanded */}
      {isExpanded && (
        <div className="backdrop-blur-sm bg-slate-800/80 p-4 rounded-b-lg border border-t-0 border-slate-700">
          <div className="grid grid-cols-1 gap-4 backdrop-blur-2xl">
            {/* Name */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={elementName || ""}
                onChange={(e) =>
                  onChange(originalId, "elementName", e.target.value)
                }
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
              />
            </div>

            {/* ID */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">ID</label>
              <input
                type="text"
                value={elementId || ""}
                onChange={(e) =>
                  onChange(originalId, "elementId", e.target.value)
                }
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200"
              />
            </div>

            {/* Color */}
            <div
              key="mobileColorContainer"
              className="relative"
              ref={mobileColorContainerRef}
            >
              <label className="block text-xs text-slate-400 mb-1">Color</label>
              <div
                className="flex items-center w-full bg-slate-700/50 border border-slate-600/50 rounded-md px-3 py-2 text-slate-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorDropdown(!showColorDropdown);
                }}
              >
                {elementColor ? (
                  <>
                    <div
                      style={getColorStyle(elementColor)}
                      className="w-5 h-5 rounded-full mr-2"
                    />
                    <span>{elementColor}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Select color</span>
                )}

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-auto text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {showColorDropdown && <ColorDropdown isMobile={true} />}
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
                  value={elementQuantityOnHand || 0}
                  onChange={(e) =>
                    handleQuantityChange(
                      "elementQuantityOnHand",
                      e.target.value
                    )
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
                  value={elementQuantityRequired || 0}
                  onChange={(e) =>
                    handleQuantityChange(
                      "elementQuantityRequired",
                      e.target.value
                    )
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
                  setTimeout(() => {
                    // state is updated after a delay to allow for animation
                    // this is a workaround for the animation to work properly
                    onChange(originalId, "highlighted", !highlighted);
                  }, 100);
                }}
                className={`flex items-center px-3 py-1.5 rounded transition-colors duration-150 ${
                  piece.highlighted
                    ? "bg-pink-500/30 text-pink-300"
                    : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                }`}
                title={
                  piece.highlighted ? "Remove highlight" : "Highlight piece"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                {highlighted ? "Remove highlight" : "Highlight piece"}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                className="flex items-center px-3 py-1.5 bg-rose-600/20 text-rose-400 rounded-md hover:bg-rose-600/30 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const DesktopView = () => (
    <div
      key="DesktopView"
      className={`hidden switch:flex items-center w-full px-2 py-1 mx-1 my-1 ${
        isLast ? "mb-4" : ""
      } rounded-lg border-l-4 ${getRowStyle()}`}
    >
      {LoadingOverlay}

      {/* Image */}
      <div
        className={`${columns[0]?.width} flex-shrink-0 flex justify-center px-2`}
      >
        <div className="h-12 w-12 bg-slate-700 rounded overflow-hidden flex items-center justify-center">
          {availableColors?.find((color) => color.colorId == elementColorId)
            ?.elementImage ? (
            <img
              src={
                availableColors.find((color) => color.colorId == elementColorId)
                  .elementImage
              }
              alt={elementName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-slate-500">No image</span>
          )}
        </div>
      </div>

      {/* Name */}
      <div className={`${columns[1]?.width} flex-shrink-0 px-2`}>
        <input
          type="text"
          value={elementName || ""}
          onChange={(e) => onChange(originalId, "elementName", e.target.value)}
          className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
        />
      </div>

      {/* ID */}
      <div className={`${columns[2]?.width} flex-shrink-0 px-2`}>
        <input
          type="text"
          value={elementId || ""}
          onChange={(e) => onChange(originalId, "elementId", e.target.value)}
          className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
        />
      </div>

      {/* Color */}
      <div
        className={`${columns[3]?.width} flex-shrink-0 px-2 relative`}
        ref={desktopColorContainerRef}
        key="desktopColorContainer"
      >
        <div
          className="flex items-center w-full bg-transparent border border-transparent hover:border-slate-600 hover:bg-slate-700/30 px-2 py-1.5 rounded text-slate-200 cursor-pointer transition-colors duration-150"
          onClick={() => setShowColorDropdown(!showColorDropdown)}
        >
          <div
            style={getColorStyle(elementColor)}
            className="w-5 h-5 rounded-full mr-2"
          />
          <span className="truncate flex-1">
            {elementColor || "Select color"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-slate-400 ml-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {showColorDropdown && <ColorDropdown isMobile={false} />}
      </div>

      {/* On Hand */}
      <div className={`${columns[4]?.width} flex-shrink-0 px-2`}>
        <input
          type="number"
          min="0"
          value={elementQuantityOnHand || 0}
          onChange={(e) =>
            handleQuantityChange("elementQuantityOnHand", e.target.value)
          }
          className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
        />
      </div>

      {/* Required */}
      <div className={`${columns[5]?.width} flex-shrink-0 px-2`}>
        <input
          type="number"
          min="0"
          value={elementQuantityRequired || 0}
          onChange={(e) =>
            handleQuantityChange("elementQuantityRequired", e.target.value)
          }
          className="w-full bg-transparent border border-transparent focus:border-slate-600 px-2 py-1.5 rounded text-slate-200 hover:bg-slate-700/30 transition-colors duration-150"
        />
      </div>

      {/* Complete Status */}
      <div
        className={`${columns[6]?.width} flex-shrink-0 px-2 flex justify-center`}
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
            onChange(originalId, "highlighted", !highlighted);
          }}
          className={`p-1.5 rounded transition-colors duration-150 ${
            highlighted
              ? "bg-pink-500/30 text-pink-300"
              : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
          }`}
          title={highlighted ? "Remove highlight" : "Highlight piece"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </button>

        <button
          onClick={handleDeleteClick}
          className="p-1.5 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600/30 transition-colors duration-150"
          title="Delete piece"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="animate-fadeIn animate-slideDown">
        <DesktopView key="desktop-view" />
        <MobileView key="mobile-view" />
      </div>
    </>
  );
};

/**
 * Checks if the component needs to be re-rendered
 *
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 * @returns {boolean} Whether the component should update
 */
function areEqual(prevProps, nextProps) {
  // Check if any props have changed
  const basicPropsEqual =
    prevProps.originalId === nextProps.originalId &&
    prevProps.isUpdating === nextProps.isUpdating;

  if (!basicPropsEqual) return false;

  // Then do a shallow comparison of the piece object
  const prevPiece = prevProps.piece;
  const nextPiece = nextProps.piece;

  // If references are the same, they're equal
  if (prevPiece === nextPiece) return true;

  // Check each important property
  return (
    prevPiece.elementId === nextPiece.elementId &&
    prevPiece.elementName === nextPiece.elementName &&
    prevPiece.elementColor === nextPiece.elementColor &&
    prevPiece.elementColorId === nextPiece.elementColorId &&
    prevPiece.elementQuantityOnHand === nextPiece.elementQuantityOnHand &&
    prevPiece.elementQuantityRequired === nextPiece.elementQuantityRequired &&
    prevPiece.countComplete === nextPiece.countComplete &&
    prevPiece.highlighted === nextPiece.highlighted
  );
}

export default memo(PieceRow, areEqual);
