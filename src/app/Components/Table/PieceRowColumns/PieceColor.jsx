// src/app/components/Table/PieceRowColumns/PieceColor.jsx

import { useState, useRef, useEffect } from "react";
import ColorSelect from "@/Components/Misc/ColorSelect";

export default function PieceColor({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`${colBase} ${columnWidths.color} flex-1 relative`}>
      <ColorSelect
        piece={piece}
        availablePieceColors={piece.availableColors || []}
        colorName={piece.elementColor}
        onChange={(colorName) => {
          onChange(originalId, "elementColor", colorName);
        }}
        className="w-full"
      />
    </div>
  );
}
