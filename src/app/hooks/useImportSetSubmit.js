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
      // Show loading state to the user
      console.log(`Importing set ${details.set_num}: ${details.name}...`);

      // Fetch set parts with cached color data
      const res = await fetch(`/api/set/${details.set_num}/parts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch set data: ${res.statusText}`);
      }

      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        throw new Error("No parts found for this set");
      }

      // Save original table for rollback if needed
      const originalTable = selectedTable;

      function resetTableState() {
        setSelectedTable(originalTable);
      }

      const { results, stats } = data;
      console.log(
        `Set contains ${results.length} parts. ${
          stats?.partsWithCachedColors || 0
        } parts have cached colors.`
      );

      // Check if table already exists
      const alreadyExists = availableTables.some(
        (table) => table.name === details.name
      );
      if (alreadyExists) {
        alert("This set is already imported!");
        return;
      }

      // Create new table
      const newTableId =
        Math.max(...availableTables.map((t) => Number(t.id))) + 1;
      const tableName = `${details.name} (${details.set_num})`;
      const newTable = {
        name: tableName,
        id: newTableId.toString(),
      };

      // Map API results to our piece format
      const importedPieces = results.map((item) => {
        // Create base piece object
        const piece = {
          uuid: uuidv4(),
          elementName: item.elementName,
          elementId: item.elementId,
          elementColor: item.elementColor || "Black",
          elementColorId: item.elementColorId || 0,
          elementQuantityOnHand: 0,
          elementQuantityRequired: item.quantity,
          countComplete: false,
          tableId: newTable.id,
          ownerId: "default",
          availableColors: item.availableColors || [],
          cacheIncomplete: item.cacheIncomplete || false,
        };

        return piece;
      });

      // Create the table in the database
      console.log(`Creating new table: ${tableName}`);
      const tableReady = await addTable(tableName);

      if (!tableReady) {
        throw new Error("Failed to create table");
      }

      // Update local state for tables
      setAvailableTables([...availableTables, newTable]);
      setSelectedTable(newTable);

      // Save pieces to the new table
      console.log(
        `Saving ${importedPieces.length} pieces to table ${newTable.id}`
      );
      const ready = await fetch(`/api/table/${newTable.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(importedPieces),
      });

      if (!ready.ok) {
        resetTableState();
        throw new Error("Failed to save pieces to table");
      }

      const readyData = await ready.json();

      if (!readyData.success) {
        resetTableState();
        throw new Error("Database operation failed");
      }

      // Update client-side state with the new pieces
      setTimeout(() => {
        setPiecesByTable((prev) => ({
          ...prev,
          [newTable.id]: importedPieces,
        }));
      }, 1000);

      // Collect part IDs that still need color data
      // we supply the response with one set of the original color data, so the imported pieces will always have ATLEAST one color in availableColors
      // check if we have more than one color, if it does we fetch the rest
      const piecesNeedingColors = importedPieces
        .filter((p) => p.availableColors.length <= 1 || !p.availableColors)
        .map((p) => p.elementId);

      console.log(`${piecesNeedingColors.length} pieces still need color data`);

      // Only run post-processing for pieces without color data
      // if (piecesNeedingColors.length > 0) {
      //   fetch("/api/set/postProcessColor/", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       pieceIds: piecesNeedingColors,
      //       ownerId: "default",
      //       tableId: newTable.id,
      //     }),
      //   }).catch((error) => {
      //     console.error("Error processing colors:", error);
      //     // Non-blocking error - user will still have basic functionality
      //   });
      // }

      console.log(`Set "${details.name}" imported successfully!`);
    } catch (err) {
      console.error("Error during set import:", err);
      alert(`Failed to import set: ${err.message}`);
    }
  };

  return handleImportSetSubmit;
}
