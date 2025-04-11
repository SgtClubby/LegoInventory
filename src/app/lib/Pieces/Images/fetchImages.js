// src/app/lib/Pieces/Images/fetchImages.js

/**
 * Improved fetchImageForPiece function with better error handling
 *
 * @param {string} elementId - The part element ID
 * @param {string} colorId - The color ID
 * @returns {Promise<string|null>} The image URL or null if fetch fails
 */
export async function fetchImageForPiece(elementId, colorId) {
  if (!elementId || colorId === undefined || colorId === null) {
    console.warn("fetchImageForPiece called without valid IDs", {
      elementId,
      colorId,
    });
    return null;
  }

  try {
    console.log(`Fetching image for part ${elementId} with color ${colorId}`);
    const response = await fetch(`/api/image/${elementId}/${colorId}`);

    if (!response.ok) {
      console.log("Image fetch failed with status:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("Image API response:", data);

    // Make sure we're returning the correct property
    if (data && data.part_img_url) {
      return data.part_img_url;
    } else {
      console.warn("Image API response missing part_img_url:", data);
      return null;
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}
