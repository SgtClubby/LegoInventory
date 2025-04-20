// src/app/Components/Table/PieceRow.jsx
import React, { useState, memo, useRef, useEffect, useCallback } from "react";

// Functions and Helpers
import { debounce } from "lodash";
import PieceDesktopView from "./PieceRow/Piece/PieceDesktopView";
import PieceMobileView from "./PieceRow/Piece/PieceMobileView";
import MinifigDesktopView from "./PieceRow/Minifig/MinifigDesktopView";
import MinifigMobileView from "./PieceRow/Minifig/MinifigMobileView";

/**
 * Component that renders a single piece or minifig row in both mobile and desktop views
 *
 * @param {Object} piece - The piece/minifig data
 * @param {Function} onChange - Handler for changes to the piece
 * @param {Function} onDelete - Handler for deleting the piece
 * @param {string} originalId - UUID of the piece
 * @param {boolean} isUpdating - Whether the piece is currently updating
 * @param {Array} columns - Column configuration for the table
 * @param {number} index - Index of the piece in the list
 * @param {number} zIndex - Z-index for the row
 * @param {Object} selectedTable - Selected table information
 * @returns {React.ReactElement} The PieceRow component
 */
const PieceRow = ({
  piece,
  onChange,
  onDelete,
  originalId,
  isUpdating = false,
  columns = [],
  index,
  zIndex = 0,
  selectedTable,
}) => {
  // Determine if this is a minifig or a regular piece
  const isMinifig = selectedTable?.isMinifig;

  // Use useState with a function to initialize it correctly on first render
  const [fields, setFields] = useState(() => {
    if (isMinifig) {
      return {
        minifigName: piece.minifigName || "",
        minifigIdRebrickable: piece.minifigIdRebrickable || "",
        minifigIdBricklink: piece.minifigIdBricklink || "",
        minifigImage: piece.minifigImage || "",
        minifigQuantity: parseInt(piece.minifigQuantity) || 0,
        // Include other important properties
        highlighted: piece.highlighted,
        priceData: piece.priceData,
        countComplete: piece.countComplete,
      };
    } else {
      return {
        elementName: piece.elementName || "",
        elementId: piece.elementId || "",
        elementColor: piece.elementColor || "",
        elementColorId: piece.elementColorId || "",
        elementQuantityOnHand: parseInt(piece.elementQuantityOnHand) || 0,
        elementQuantityRequired: parseInt(piece.elementQuantityRequired) || 0,
        availableColors: piece.availableColors || [],
        // Include other important properties
        countComplete: piece.countComplete,
        highlighted: piece.highlighted,
        invalid: piece.invalid,
      };
    }
  });

  // Other state
  const [fieldToUpdate, setFieldToUpdate] = useState(null);
  const pendingFieldsRef = useRef({});

  // Force fields to update completely when piece changes
  useEffect(() => {
    if (isMinifig) {
      setFields({
        minifigName: piece.minifigName || "",
        minifigIdRebrickable: piece.minifigIdRebrickable || "",
        minifigIdBricklink: piece.minifigIdBricklink || "",
        minifigImage: piece.minifigImage || "",
        minifigQuantity: parseInt(piece.minifigQuantity) || 0,
        // Include other important properties
        highlighted: piece.highlighted,
        priceData: piece.priceData,
        countComplete: piece.countComplete,
      });
    } else {
      setFields({
        elementName: piece.elementName || "",
        elementId: piece.elementId || "",
        elementColor: piece.elementColor || "",
        elementColorId: piece.elementColorId || "",
        elementQuantityOnHand: parseInt(piece.elementQuantityOnHand) || 0,
        elementQuantityRequired: parseInt(piece.elementQuantityRequired) || 0,
        availableColors: piece.availableColors || [],
        countComplete: piece.countComplete,
        highlighted: piece.highlighted,
        invalid: piece.invalid,
      });
    }
    // Clear any pending updates since we're getting fresh data
    pendingFieldsRef.current = {};
  }, [piece, isMinifig]);

  // Normal controlled updates from user input
  const sendUpdate = useCallback(
    debounce((originalId, field, value) => {
      // Mark as no longer pending
      delete pendingFieldsRef.current[field];

      // For quantity fields, ensure numeric values
      if (
        field === "elementQuantityOnHand" ||
        field === "elementQuantityRequired" ||
        field === "minifigQuantity"
      ) {
        const numValue = parseInt(value) || 0;
        return onChange(originalId, field, numValue);
      }

      onChange(originalId, field, value);
    }, 500),
    [onChange]
  );

  useEffect(() => {
    if (!fieldToUpdate) return;

    // Special handling for color - no debounce
    if (fieldToUpdate.field === "elementColor") {
      onChange(originalId, "elementColor", fieldToUpdate.value);
      setFieldToUpdate(null);
      return;
    }

    // For other fields, use debounce
    if (sendUpdate.cancel) {
      sendUpdate.cancel();
    }

    sendUpdate(originalId, fieldToUpdate.field, fieldToUpdate.value);
    setFieldToUpdate(null);
  }, [fieldToUpdate, onChange, originalId, sendUpdate]);

  const handleChange = (updates) => {
    // Validate and clean up values
    let value = updates.value;

    // For quantity fields, ensure we have valid numbers in the UI
    if (
      updates.field === "elementQuantityOnHand" ||
      updates.field === "elementQuantityRequired" ||
      updates.field === "minifigQuantity"
    ) {
      // Allow empty fields during typing, but convert NaN to 0
      value = value === "" ? "" : parseInt(value) || 0;
    }

    // Mark this field as having pending changes
    pendingFieldsRef.current[updates.field] = true;

    // Update local state immediately
    setFields((prevFields) => ({
      ...prevFields,
      [updates.field]: value,
    }));

    // Queue the update to be sent to the server
    setFieldToUpdate({
      field: updates.field,
      value: value,
    });
  };

  const handleDeleteClick = () => {
    onDelete(originalId);
  };

  // For highlighted state, keep it synced with fields
  const highlighted = fields.highlighted;
  const setHighlighted = (value) => {
    setFields((prev) => ({
      ...prev,
      highlighted: value,
    }));
  };

  // Loading overlay
  const LoadingOverlay = isUpdating ? (
    <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] pointer-events-none z-10 flex items-center justify-center">
      <div className="h-5 w-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
    </div>
  ) : null;

  // Render different components based on whether we're dealing with a minifig or a regular piece
  return (
    <>
      {isMinifig ? (
        <>
          {/* Minifig Desktop View */}
          <MinifigDesktopView
            originalProps={{
              piece,
              onChange,
              onDelete,
              originalId,
              isUpdating,
              columns,
              index,
              zIndex,
              selectedTable,
            }}
            handleChange={handleChange}
            handleDeleteClick={handleDeleteClick}
            fields={fields}
            LoadingOverlay={LoadingOverlay}
            setHighlighted={setHighlighted}
            highlighted={highlighted}
            isUpdating={isUpdating}
            setFields={setFields}
            countComplete={fields.countComplete}
            key={piece.uuid + "desktop"}
          />

          {/* Minifig Mobile View */}
          <MinifigMobileView
            originalProps={{
              piece,
              selectedTable,
            }}
            handleChange={handleChange}
            handleDeleteClick={handleDeleteClick}
            fields={fields}
            LoadingOverlay={LoadingOverlay}
            setHighlighted={setHighlighted}
            highlighted={highlighted}
            isUpdating={isUpdating}
            countComplete={fields.countComplete}
            key={piece.uuid + "mobile"}
          />
        </>
      ) : (
        <>
          {/* Regular Piece Desktop View */}
          <PieceDesktopView
            originalProps={{
              piece,
              onChange,
              onDelete,
              originalId,
              isUpdating,
              columns,
              index,
              zIndex,

              selectedTable,
            }}
            handleChange={handleChange}
            handleDeleteClick={handleDeleteClick}
            fields={fields}
            LoadingOverlay={LoadingOverlay}
            setHighlighted={setHighlighted}
            highlighted={highlighted}
            isUpdating={isUpdating}
            setFields={setFields}
            countComplete={fields.countComplete}
            key={piece.uuid + "desktop"}
          />
          {/* Regular Piece Mobile View */}
          <PieceMobileView
            originalProps={{
              piece,
              selectedTable,
            }}
            handleChange={handleChange}
            handleDeleteClick={handleDeleteClick}
            fields={fields}
            LoadingOverlay={LoadingOverlay}
            setHighlighted={setHighlighted}
            highlighted={highlighted}
            isUpdating={isUpdating}
            countComplete={fields.countComplete}
            key={piece.uuid + "mobile"}
          />
        </>
      )}
    </>
  );
};

/**
 * Optimization: only re-render when relevant props change
 */
function areEqual(prevProps, nextProps) {
  // Check if any props have changed
  const basicPropsEqual =
    prevProps.originalId === nextProps.originalId &&
    prevProps.isUpdating === nextProps.isUpdating &&
    prevProps.index === nextProps.index;

  if (!basicPropsEqual) return false;

  // Then do a shallow comparison of the piece object
  const prevPiece = prevProps.piece;
  const nextPiece = nextProps.piece;

  // If references are the same, they're equal
  if (prevPiece === nextPiece) return true;

  // Check if it's a minifig or regular piece
  const isMinifig = prevProps.selectedTable?.isMinifig;

  if (isMinifig) {
    // Check each important property for minifigs
    return (
      prevPiece.minifigIdRebrickable === nextPiece.minifigIdRebrickable &&
      prevPiece.minifigName === nextPiece.minifigName &&
      prevPiece.minifigQuantity === nextPiece.minifigQuantity &&
      prevPiece.countComplete === nextPiece.countComplete &&
      prevPiece.highlighted === nextPiece.highlighted &&
      JSON.stringify(prevPiece.priceData) ===
        JSON.stringify(nextPiece.priceData)
    );
  } else {
    // Check each important property for regular pieces
    return (
      prevPiece.elementId === nextPiece.elementId &&
      prevPiece.elementName === nextPiece.elementName &&
      prevPiece.elementColor === nextPiece.elementColor &&
      prevPiece.elementColorId === nextPiece.elementColorId &&
      prevPiece.elementQuantityOnHand === nextPiece.elementQuantityOnHand &&
      prevPiece.elementQuantityRequired === nextPiece.elementQuantityRequired &&
      prevPiece.countComplete === nextPiece.countComplete &&
      prevPiece.highlighted === nextPiece.highlighted &&
      prevPiece.invalid === nextPiece.invalid
    );
  }
}

// Then use this improved areEqual function in memo call
export default memo(PieceRow, areEqual);
