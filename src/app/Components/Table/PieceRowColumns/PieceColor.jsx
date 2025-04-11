// src/app/components/Table/PieceRowColumns/PieceColor.jsx

import { useRef, useEffect } from "react";
import ColorSelect from "@/Components/Misc/ColorSelect";

export default function PieceColor({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
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
