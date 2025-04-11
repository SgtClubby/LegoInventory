// src/app/Components/Table/PieceRowColumns/PieceID.jsx

import { useState, useEffect } from "react";

export default function PieceID({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  // Use local state for the input value
  const [inputValue, setInputValue] = useState(piece.elementId);

  // Update local state when props change (for actual updates from elsewhere)
  useEffect(() => {
    setInputValue(piece.elementId);
  }, [piece.elementId]);

  // Handle local changes without immediately updating parent
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Only update parent component when editing is complete
  const handleBlur = () => {
    // Only trigger update if value actually changed
    if (inputValue !== piece.elementId) {
      onChange(originalId, "elementId", inputValue);
    }
  };

  // Also update on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.target.blur(); // Will trigger onBlur
    }
  };

  return (
    <div className={`${colBase} ${columnWidths.id}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200"
      />
    </div>
  );
}
