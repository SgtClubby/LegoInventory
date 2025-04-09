// src/app/lib/Misc/ImportExport.js

import { v4 as uuidv4 } from "uuid";

// Handler for importing data from JSON
export function handleImport(event, setPieces) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // add ids to imported data
        const importedDataWithIds = importedData.map((piece, index) => ({
          ...piece,
          id: uuidv4(),
        }));

        if (Array.isArray(importedDataWithIds)) {
          setPieces(importedDataWithIds);
        }
      } catch (error) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }
}

// Handler for exporting data to JSON
export function handleExport(pieces) {
  if (pieces.length === 0) {
    alert("No pieces to export");
    return;
  }
  const dataStr = JSON.stringify(pieces, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "lego-pieces.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
