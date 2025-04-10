// src/app/lib/Pieces/Images/fetchImages.js

export async function fetchImageForPiece(pieceId, colorId) {
  try {
    const res = await fetch(`/api/image/${pieceId}/${colorId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });
    const data = await res.json();
    if (data && data.part_img_url) {
      return data.part_img_url;
    }
  } catch (err) {
    console.error(`Error fetching image for ${pieceId}-${colorId}:`, err);
  }
  return null;
}