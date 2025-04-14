// src/app/Components/Table/PieceRow/ColorDropdown.jsx

import colors from "@/Colors/colors.js";
import getColorStyle from "@/lib/Misc/getColorStyle";

export default function ColorDropdown({
  availableColors,
  ref,
  reactKey,
  setShow,
  handleChange,
}) {
  const colorOptions =
    availableColors && availableColors.length > 0
      ? colors.filter((c) =>
          availableColors.some(
            (apc) => String(apc.colorId) === String(c.colorId)
          )
        )
      : colors;

  return (
    <div
      ref={ref}
      key={reactKey}
      className="absolute z-60 top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-md shadow-xl animate-fadeIn animate-slideDown"
    >
      <div className="py-1 divide-y divide-slate-700">
        {colorOptions.map((color) => (
          <div
            key={reactKey + color.colorId}
            className="flex items-center px-3 py-2 hover:bg-slate-700 cursor-pointer transition-colors duration-150"
            onClick={(e) => {
              handleChange({
                field: "elementColor",
                value: color.colorName,
              });
              setShow(false);
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
}
