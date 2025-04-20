// src/app/lib/Color/ColorMapper.js

// src/app/lib/Misc/ColorMapper.js

import bricklinkMap from "@/Colors/bricklinkMap";
import colors from "@/Colors/colors";

/**
 * Creates bidirectional mappings between different color ID systems
 *
 * @returns {Object} Object containing color mapping functions
 */
const createColorMapper = () => {
  // Create mapping from color name to various IDs
  const nameToIds = {};
  const bricklinkIdToColor = {};
  const internalIdToColor = {};

  // Map colors from internal color system
  colors.forEach((color) => {
    nameToIds[color.colorName] = {
      internalId: color.colorId,
      bricklinkId: null,
      hex: color.hex,
    };

    internalIdToColor[color.colorId] = color.colorName;
  });

  // Add bricklink IDs to colors that exist in both systems
  Object.entries(bricklinkMap).forEach(([colorName, bricklinkId]) => {
    // If this color exists in our internal system, add the bricklink ID
    if (nameToIds[colorName]) {
      nameToIds[colorName].bricklinkId = bricklinkId;
      bricklinkIdToColor[bricklinkId] = colorName;
    }
  });

  return {
    /**
     * Converts from internal color ID to bricklink ID
     *
     * @param {string|number} internalId - Internal color ID
     * @returns {string|null} Bricklink color ID or null if no mapping exists
     */
    internalToBricklinkId: (internalId) => {
      const colorName = internalIdToColor[internalId];
      return (colorName && nameToIds[colorName]?.bricklinkId) || null;
    },

    /**
     * Converts from bricklink color ID to internal color ID
     *
     * @param {string|number} bricklinkId - Bricklink color ID
     * @returns {string|null} Internal color ID or null if no mapping exists
     */
    bricklinkToInternalId: (bricklinkId) => {
      const colorName = bricklinkIdToColor[bricklinkId];
      return (colorName && nameToIds[colorName]?.internalId) || null;
    },

    /**
     * Gets color name from internal ID
     *
     * @param {string|number} internalId - Internal color ID
     * @returns {string|null} Color name or null if not found
     */
    getColorNameFromInternalId: (internalId) => {
      return internalIdToColor[internalId] || null;
    },

    /**
     * Gets color name from bricklink ID
     *
     * @param {string|number} bricklinkId - Bricklink color ID
     * @returns {string|null} Color name or null if not found
     */
    getColorNameFromBricklinkId: (bricklinkId) => {
      return bricklinkIdToColor[bricklinkId] || null;
    },

    /**
     * Gets hex color from color name
     *
     * @param {string} colorName - Color name
     * @returns {string|null} Hex color code or null if not found
     */
    getHexFromName: (colorName) => {
      return nameToIds[colorName]?.hex || null;
    },
  };
};

const colorMapper = createColorMapper();
export default colorMapper;
