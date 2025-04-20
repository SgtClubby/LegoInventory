// src/app/lib/Misc/ImportExport.js

import { v4 as uuidv4 } from "uuid";

export function detectStructureType(data) {
  const importedData = Array.isArray(data) ? data : [data];
  let type = null;

  importedData.forEach((piece) => {
    const hasMinifigKeys =
      "minifigIdRebrickable" in piece &&
      "minifigIdBricklink" in piece &&
      "minifigQuantity" in piece;

    const hasPieceKeys =
      "elementId" in piece &&
      "elementColorId" in piece &&
      "elementQuantityOnHand" in piece &&
      Array.isArray(piece.availableColors);

    if (hasMinifigKeys) {
      console.log("Minifig structure detected");
      type = "minifig";
    }

    if (hasPieceKeys) {
      console.log("Piece structure detected");
      type = "piece";
    }
  });

  if (type === null) {
    console.error("Unknown data structure");
    return "invalid";
  }
  return type;
}

// Handler for importing data from JSON
export function handleImport(event, callback) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // add ids to imported data
        const importedDataWithIds = importedData.map((piece, index) => ({
          ...piece,
          uuid: uuidv4(),
        }));

        if (Array.isArray(importedDataWithIds)) {
          callback(importedDataWithIds);
        }
      } catch (error) {
        console.error("Error parsing JSON file: " + error.message);
      }
    };
    reader.readAsText(file);
  }
}

// Handler for exporting data to JSON
export function handleExport(pieces, isMinifig) {
  if (pieces.length === 0) {
    alert("No pieces to export");
    return;
  }

  // Filter out unnecessary properties
  const filteredPieces = pieces.map((piece) => {
    const {
      uuid,
      tableId,
      ownerId,
      highlighted,
      createdAt,
      priceData,
      ...rest
    } = piece;

    return rest;
  });

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "lego-pieces.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
