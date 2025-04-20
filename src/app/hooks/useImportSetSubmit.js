// src/app/hooks/useImportSetSubmit.js

"use client";
import { useLego } from "@/Context/LegoContext";
import { addTable } from "@/lib/Table/TableManager";
import { v4 as uuidv4 } from "uuid";
import { useStatus } from "@/Context/StatusContext";
import { useState } from "react";

/**
 * Hook for handling set import functionality with improved error handling and state management
 *
 * @returns {Object} Import functions and state
 */
export function useImportSetSubmit() {
  const {
    availableTables,
    selectedTable,
    setAvailableTables,
    setSelectedTable,
    setPiecesByTable,
  } = useLego();

  const { showSuccess, showError, showWarning } = useStatus();
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  /**
   * Handles the set import process
   *
   * @param {Object} details - Set details from API
   * @returns {Promise<Object>} Result with success status
   */
  const handleImportSetSubmit = async (details) => {
    if (isImporting) {
      showWarning("An import is already in progress", { position: "top" });
      return { success: false, error: "Import already in progress" };
    }

    setIsImporting(true);
    setImportProgress(10);

    try {
      // Show loading state to the user
      console.log(`Importing set ${details.setId}: ${details.setName}...`);

      // Fetch set parts with cached color data
      setImportProgress(20);
      const res = await fetch(`/api/set/${details.setId}/parts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch set data: ${res.status} ${errorText}`);
      }

      setImportProgress(40);
      const data = await res.json();

      if (!data || !data.results || data.results.length === 0) {
        showWarning(
          `No parts found for set "${details.setName}", might be an error, try again later...`,
          {
            position: "top",
            autoCloseDelay: 3000,
          }
        );
        return { success: false, error: "No parts found" };
      }

      // Save original table for rollback if needed
      const originalTable = selectedTable;

      /**
       * Reset table state to original in case of error
       */
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
      const tableName = `${details.setName}`;
      const tableDescription = `Set ${details.setId}`;
      console.log(`Creating new table: ${tableName}`);

      setImportProgress(60);
      const newTable = await addTable(tableName, tableDescription, false);

      if (!newTable || newTable.error) {
        resetTableState();
        throw new Error(`Failed to create table: ${newTable?.error}`);
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

      setImportProgress(80);

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
        const errorText = await ready.text();
        throw new Error(
          `Failed to save set pieces: ${ready.status} ${errorText}`
        );
      }

      const readyData = await ready.json();

      if (!readyData.success) {
        resetTableState();
        throw new Error("Failed to save pieces");
      }

      // Update client-side state with the new pieces
      setPiecesByTable((prev) => ({
        ...prev,
        [newTable.id]: importedPieces,
      }));

      setImportProgress(100);
      showSuccess(`Set ${details.setId} imported successfully!`, {
        position: "top",
        autoCloseDelay: 5000,
      });

      // Start post-processing in the background
      postProcessColorCache(
        importedPieces,
        newTable,
        showWarning,
        showSuccess,
        showError
      );

      return { success: true };
    } catch (err) {
      console.error("Error during set import:", err);
      showError(`Failed to import set: ${err.message}`, {
        position: "top",
        autoCloseDelay: 5000,
      });
      return { success: false, error: err.message };
    } finally {
      setIsImporting(false);
    }
  };

  return {
    handleImportSetSubmit,
    isImporting,
    importProgress,
  };
}

/**
 * Handles background processing of color data after initial import
 *
 * @param {Array} importedPieces - The imported pieces
 * @param {Object} newTable - The newly created table
 * @param {Function} showWarning - Function to show warning
 * @param {Function} showSuccess - Function to show success
 * @param {Function} showError - Function to show error
 */
async function postProcessColorCache(
  importedPieces,
  newTable,
  showWarning,
  showSuccess,
  showError
) {
  const piecesNeedingColors = importedPieces
    .filter((p) => p.cacheIncomplete === true)
    .map((p) => p.elementId);

  console.log(`${piecesNeedingColors.length} pieces still need color data`);

  // Only run post-processing for pieces without color data
  if (piecesNeedingColors.length > 0) {
    setTimeout(() => {
      showWarning(
        `NOTE: ${piecesNeedingColors.length} pieces still need additional color and image data, this may take a moment...`,
        {
          position: "top",
          autoCloseDelay: 15000,
        }
      );
    }, 2000);

    try {
      const response = await fetch("/api/set/postProcessColor/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pieceIds: piecesNeedingColors,
          ownerId: "default",
          tableId: newTable.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Processing failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        showSuccess(
          `Additional color and image data has been processed. Refresh to see updated images.`,
          {
            position: "top",
            autoCloseDelay: 3000,
          }
        );
      } else {
        throw new Error(result.error || "Unknown error during processing");
      }
    } catch (err) {
      console.error("Error during post-processing:", err);
      showError(`Failed to process additional color data: ${err.message}`, {
        position: "top",
        autoCloseDelay: 3000,
      });
    }
  }
}
