// src/app/hooks/useImportSetSubmit.js

"use client";
import { useLego } from "@/Context/LegoContext";
import { addTable } from "@/lib/Table/TableManager";
import colors from "@/Colors/colors.js";
import { v4 as uuidv4 } from "uuid";

export function useImportSetSubmit() {
  const {
    availableTables,
    selectedTable,
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

      const originalTable = selectedTable;

      function resetTableState() {
        setSelectedTable(originalTable);
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
          availableColors: [],
          elementQuantityOnHand: 0,
          elementQuantityRequired: piece.quantity,
          countComplete: false,
          tableId: newTable.id,
          ownerId: "default",
        };
      });

      // We init all the data then do the checks
      const tableReady = await addTable(tableName);
      console.log(tableReady);
      if (!tableReady) {
        alert("Failed to fetch set! Failed to create table!");
        return;
      }

      setAvailableTables([...availableTables, newTable]);
      setSelectedTable(newTable);

      const ready = await fetch(`/api/table/${newTable.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
        },
        body: JSON.stringify(importedPieces),
      });

      if (!ready.ok) {
        resetTableState();
        alert("Failed to fetch set! Failed to during import!");
        return;
      }

      const readyData = await ready.json();

      if (!readyData.success) {
        resetTableState();
        alert("Failed to fetch set! Failed to during import!");
        return;
      }

      setPiecesByTable((prev) => ({
        ...prev,
        [newTable.id]: importedPieces,
      }));

      const pieceIds = importedPieces.map((p) => p.elementId);
      const brickUuids = importedPieces.map((p) => p.uuid);

      if (readyData.success) {
        fetch("/api/set/postProcessColor/", {
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
        }).catch((error) => {
          console.error("Error processing colors:", error);
          // Optionally show a non-blocking notification to user
        });
      }
    } catch (err) {
      console.error("Error during set import:", err);
      alert("Something went wrong while importing the set.");
    }
  };

  return handleImportSetSubmit;
}
