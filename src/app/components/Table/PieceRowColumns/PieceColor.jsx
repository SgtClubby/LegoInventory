// src/app/components/Table/PieceRowColumns/PieceColor.jsx

import getColorStyle from "@/lib/Misc/getColorStyle";
import colors from "@/colors/colors";

export default function PieceColor({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const {
    elementId,
    elementName,
    elementColor,
    elementImage,
    elementQuantityOnHand,
    elementQuantityRequired,
    countComplete,
  } = piece;

  return (
    <div className={`${colBase} ${columnWidths.color} flex-1`}>
      <div className="flex items-center">
        <div
          style={getColorStyle(elementColor)}
          className="mr-2 w-6 h-6 rounded-full flex-shrink-0"
        ></div>
        <select
          value={elementColor}
          onChange={(e) => onChange("elementColor", originalId, e.target.value)}
          className="bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200 w-full"
        >
          {colors.map((color) => (
            <option
              className="bg-slate-800"
              key={color.colorName}
              value={color.colorName}
            >
              {color.colorName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
