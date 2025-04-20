// src/app/lib/Color/getColorStyle.js

// src/app/lib/Misc/getColorStyle.js

import colors from "@/Colors/colors.js";

// Function to get color style
export default function getColorStyle(colorName) {
  const color = colors.filter((c) => c.colorName === colorName)[0]?.hex;

  return {
    backgroundColor: color,
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    display: "inline-block",
    marginRight: "8px",
    border: "1px solid #AAA",
  };
}
