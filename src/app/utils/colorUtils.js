// src/app/utils/colorUtils.js

/**
 * Determines if text should be white or black based on background color
 * Uses the YIQ formula for perceived brightness
 *
 * @param {string} hexColor - Hex color code (e.g., "#FFFFFF")
 * @returns {string} - Returns "#FFFFFF" for dark backgrounds or "#000000" for light backgrounds
 */
export function getContrastTextColor(hexColor) {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate perceived brightness using YIQ formula
  // YIQ = (R * 299 + G * 587 + B * 114) / 1000
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  // Return white for dark colors, black for light colors
  return yiq >= 128 ? "#000000" : "#FFFFFF";
}

/**
 * Generates a CSS style object for a color option with appropriate text contrast
 *
 * @param {string} hexColor - Hex color code
 * @returns {Object} - CSS style object
 */
export function getColorOptionStyle(hexColor) {
  const textColor = getContrastTextColor(hexColor);

  return {
    backgroundColor: hexColor,
    color: textColor,
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
  };
}
