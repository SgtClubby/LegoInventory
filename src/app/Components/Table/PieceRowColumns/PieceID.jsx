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
    onChange(originalId, "elementId", e.target.value);
  };

  return (
    <div className={`${colBase} ${columnWidths.id}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        className="w-full bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200"
      />
    </div>
  );
}
