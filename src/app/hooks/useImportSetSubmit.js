// src/app/hooks/useImportSetSubmit.js

"use client";
import { useLego } from "@/Context/LegoContext";
import { addTable } from "@/lib/Table/TableManager";
import colors from "@/colors/colors.js";
import { v4 as uuidv4 } from "uuid";
import { use } from "react";

export function useImportSetSubmit() {
  const {
    availableTables,
    setAvailableTables,
    setSelectedTable,
    setPiecesByTable,
  } = useLego();

  const handleImportSetSubmit = async (details) => {
    try {
      const res = await fetch(`/api/set/${details.set_num}/parts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
        },
      });
      const data = await res.json();
      if (data.error) {
        alert("Failed to fetch set data!");
        return;
      }

      const { results } = data;

      const alreadyExists = availableTables.some(
        (table) => table.name === details.name
      );
      if (alreadyExists) {
        alert("This set is already imported!");
        return;
      }

      const newTableId =
        Math.max(...availableTables.map((t) => Number(t.id))) + 1;
      const tableName = `${details.name} (${details.set_num})`;

      const newTable = {
        name: tableName,
        id: newTableId.toString(),
      };

      await addTable(tableName);
      setAvailableTables([...availableTables, newTable]);
      setSelectedTable(newTable);

      const importedPieces = results.map((piece) => {
        const colorId = colors.find(
          (c) => c.colorName === piece.color.name
        )?.colorId;
        return {
          uuid: uuidv4(),
          elementName: piece.part.name,
          elementId: piece.part.part_num,
          elementImage: piece.part.part_img_url,
          elementColor: piece.color.name || "Black",
          elementColorId: colorId || 0,
          elementQuantityOnHand: 0,
          elementQuantityRequired: piece.quantity,
          countComplete: false,
          tableId: newTable.id,
          ownerId: "default",
        };
      });

      await fetch(`/api/table/${newTable.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
        },
        body: JSON.stringify(importedPieces),
      });

      setPiecesByTable((prev) => ({
        ...prev,
        [newTable.id]: importedPieces,
      }));

      const pieceIds = importedPieces.map((p) => p.elementId);
      const brickUuids = importedPieces.map((p) => p.uuid);

      // Send a separate request to update colors in the background
      fetch("/api/set/background/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pieceIds,
          userId: "default",
          tableId: newTable.id,
          brickUuids,
        }),
      });
    } catch (err) {
      console.error("Error during set import:", err);
      alert("Something went wrong while importing the set.");
    }
  };

  return handleImportSetSubmit;
}
