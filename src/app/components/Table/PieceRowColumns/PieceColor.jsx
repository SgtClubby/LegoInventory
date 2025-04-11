// src/app/components/Table/PieceRowColumns/PieceColor.jsx

import { useState, useRef, useEffect } from "react";
import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/colors/colors";
import CustomColorDropdown from "@/components/Misc/CustomColorDropdown";

export default function PieceColor({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const { elementColor } = piece;
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
      <CustomColorDropdown
        piece={piece}
        availablePieceColors={piece.availableColors || []}
        colorName={elementColor}
        onChange={(color) => {
          onChange("elementColor", originalId, color);
        }}
        className="w-full"
      />
    </div>
  );
}
