// src/app/hooks/useImportSetSubmit.js

"use client";
import { useLego } from "@/Context/LegoContext";
import { addTable } from "@/lib/Table/TableManager";
import { v4 as uuidv4 } from "uuid";
import { useStatus } from "@/Context/StatusContext";

export function useImportSetSubmit() {
  const {
    availableTables,
    selectedTable,
    setAvailableTables,
    setSelectedTable,
    setPiecesByTable,
  } = useLego();

  const { showSuccess, showError, showWarning } = useStatus();
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
        showError(`Failed to fetch set data: ${res.statusText}`, {
          position: "top",
        });
        return;
      }

      const data = await res.json();

      if (!data || !data.results || data.results.length === 0) {
        showWarning(
          `No parts found for set "${details.name}", might be an error, try again later...`,
          {
            position: "top",
            autoCloseDelay: 3000,
          }
        );
        return;
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

      // Create the table in the database
      const tableName = `${details.name}`;
      const tableDescription = `Set ${details.set_num}`;
      console.log(`Creating new table: ${tableName}`);

      const newTable = await addTable(tableName, tableDescription, false);

      if (!newTable || newTable.error) {
        resetTableState();
        showError(
          `Failed to create table: ${newTable?.error} try again later... `,
          {
            position: "top",
            autoCloseDelay: 3000,
          }
        );
      }

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
        showError("Failed to save set pieces, try again later...", {
          position: "top",
          autoCloseDelay: 3000,
        });
        resetTableState();
      }

      const readyData = await ready.json();

      if (!readyData.success) {
        resetTableState();
        showError("Failed to save pieces, try again later...", {
          position: "top",
          autoCloseDelay: 3000,
        });
        return;
      }

      // Update client-side state with the new pieces
      setPiecesByTable((prev) => ({
        ...prev,
        [newTable.id]: importedPieces,
      }));

      console.log("???");

      showSuccess(`Set ${details.set_num} imported successfully!`, {
        position: "top",
        autoCloseDelay: 5000,
      });

      postProcessColorCache(
        importedPieces,
        newTable,
        showWarning,
        showSuccess,
        setPiecesByTable
      );

      return { success: true };
    } catch (err) {
      console.error("Error during set import:", err);
      alert(`Failed to import set: ${err.message}`);
    }
  };

  return handleImportSetSubmit;
}

async function postProcessColorCache(
  importedPieces,
  newTable,
  showWarning,
  showSuccess
) {
  const piecesNeedingColors = importedPieces
    .filter((p) => p.cacheIncomplete === true)
    .map((p) => p.elementId);

  console.log(`${piecesNeedingColors.length} pieces still need color data`);

  // Only run post-processing for pieces without color data
  if (piecesNeedingColors.length > 0) {
    setTimeout(() => {
      showWarning(
        `NOTE: ${piecesNeedingColors.length} pieces still need additional color and image data, additional data may be unavailable.
        You will be notified when its available, this may take a moment...`,
        {
          position: "top",
          autoCloseDelay: 15000,
        }
      );
    }, 6000);

    //==============================
    // DEBUG FLAG, Set to true to disable the post-processing
    const disable = false;
    //==============================

    if (!disable) {
      await fetch("/api/set/postProcessColor/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pieceIds: piecesNeedingColors,
          ownerId: "default",
          tableId: newTable.id,
        }),
      })
        .catch((err) => {
          console.error("Error during post-processing:", err);
          showError(`Failed to post-process set pieces: ${err.message}`, {
            position: "top",
            autoCloseDelay: 3000,
          });
        })
        .finally(() => {
          setTimeout(() => {
            showSuccess(
              `
                  Saved piece color and image data!
                  If you have missing images, refresh!`,
              {
                position: "top",
                autoCloseDelay: 3000,
              }
            );
            // Update the pieces in the table with new color data
          }, 2000);
        });
    }
  }
}
