// src/app/lib/Pieces/Images/fetchImages.js

import { set } from "idb-keyval";

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

// src/app/lib/Pieces/Images/fetchImages.js

export async function saveSetImages(images) {
  console.warn("⚠️ Illegal call: saveSetImages");
  return;
  try {
    const res = await fetch("/api/image/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      body: JSON.stringify(images),
    });
    const data = await res.json();
    if (data && data.success) {
      console.log("Images uploaded successfully");
      return true;
    }
  } catch (err) {
    console.error("Error uploading images:", err);
  }
  return false;
}

export async function fetchPieceImagesForArray(
  pieceData,
  setPieceImages,
  currentPieceImages
) {
  console.warn("⚠️ Called fetchPieceImagesForArray");
  return;

  if (!pieceData?.length) return;

  const BATCH_SIZE = 20;
  let pendingPieces = pieceData.filter((piece) => {
    const key = `${piece.elementId}-${piece.elementColorId}`;
    return !(key in currentPieceImages); // only fetch if not already known (even if it's null)
  });

  for (let i = 0; i < pendingPieces.length; i += BATCH_SIZE) {
    const chunk = pendingPieces.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
        },
        body: JSON.stringify(chunk),
      });

      const chunkImages = await res.json();

      Object.keys(chunkImages).forEach(async (key) => {
        if (chunkImages[key]) {
          await set(key, chunkImages[key]);
        }
      });
    } catch (err) {
      console.error("Error fetching chunk:", err);
    }
  }
}
