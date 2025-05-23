// src/app/Components/Misc/ImportExport.jsx

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLegoState } from "@/Context/LegoStateContext";
import {
  handleExport,
  handleImport,
  detectStructureType,
} from "@/lib/Misc/ImportExport";
import {
  ArrowDownwardRounded,
  SaveAltRounded,
  SimCardDownloadRounded,
  VerticalAlignBottomRounded,
} from "@mui/icons-material";
import { apiFetch } from "@/lib/API/client/apiFetch";
import { useStatus } from "@/Context/StatusContext.tsx";

export default function ImportExport() {
  const { piecesByTable, setPiecesByTable, selectedTable } = useLegoState();
  const isMinifig = selectedTable?.isMinifig;
  const [importStatus, setImportStatus] = useState({
    success: null,
    message: "",
  });
  const [exportStatus, setExportStatus] = useState({
    success: null,
    message: "",
  });

  /**
   * Handles the import process when a file is selected
   *
   * @param {Event} event - The file input change event
   */
  const handleImportWrapper = (event) => {
    try {
      setImportStatus({ success: null, message: "Processing import..." });

      handleImport(event, async (importedData) => {
        const importType = detectStructureType(importedData);

        // Validate the import data structure type
        if (importType === "invalid") {
          setImportStatus({
            success: false,
            message: `Invalid import!`,
          });
          setTimeout(
            () => setImportStatus({ success: null, message: "" }),
            3500
          );
          return;
        }

        // Check for table type mismatches
        if (importType === "minifig" && !isMinifig) {
          setImportStatus({
            success: false,
            message: `Invalid import! This table is for pieces only.`,
          });
          setTimeout(
            () => setImportStatus({ success: null, message: "" }),
            3500
          );
          return;
        }

        if (importType === "piece" && isMinifig) {
          setImportStatus({
            success: false,
            message: `Invalid import! This table is for minifigs only.`,
          });
          setTimeout(
            () => setImportStatus({ success: null, message: "" }),
            3500
          );
          return;
        }

        // Add necessary fields to each item
        const processedImportData = importedData.map((piece) => {
          return {
            ...piece,
            uuid: uuidv4(),
            tableId: selectedTable.id,
            ownerId: selectedTable.ownerId,
            highlighted: false,
          };
        });

        // First save to database and update UI immediately for better responsiveness

        let url = `/table/${selectedTable?.id}/bricks`;
        if (isMinifig) {
          url = `/table/${selectedTable?.id}/minifigs`;
        }

        // Send the processed data to the API
        await apiFetch(url, {
          method: "POST",
          body: JSON.stringify(processedImportData),
        });

        // Update the UI state with the imported data
        setPiecesByTable((prev) => ({
          ...prev,
          [selectedTable.id]: processedImportData,
        }));

        // Show success message to user
        setImportStatus({
          success: true,
          message: `Successfully imported ${processedImportData.length} ${
            isMinifig ? "minifigs" : "pieces"
          }!`,
        });

        // If these are minifigs, fetch price data in the background
        if (isMinifig) {
          // Extract the rebrickable IDs for price fetching
          const minifigData = processedImportData.map((minifig) => ({
            minifigIdRebrickable: minifig.minifigIdRebrickable,
            minifigIdBricklink: minifig.minifigIdBricklink || null,
            minifigName: minifig.minifigName,
            minifigImage: minifig.minifigImage,
          }));

          // Fetch price data asynchronously - don't wait for it
          fetchPriceDataInBackground(minifigData);
        }

        // Reset status after 3 seconds
        setTimeout(() => setImportStatus({ success: null, message: "" }), 3000);
      });
    } catch (error) {
      console.error("Import error:", error);
      setImportStatus({
        success: false,
        message: `Import failed: ${error.message}`,
      });
      setTimeout(() => setImportStatus({ success: null, message: "" }), 3000);
    }
  };

  /**
   * Fetches price data for minifigs in the background without blocking the UI
   * Updates the piecesByTable state when price data is received
   *
   * @param {Array} minifigData - Array of minifig objects with IDs
   */
  const fetchPriceDataInBackground = async (minifigData) => {
    try {
      // Only process items with valid IDs
      const validMinifigs = minifigData.filter((m) => m.minifigIdRebrickable);

      if (validMinifigs.length === 0) return;

      console.log(
        `Fetching price data for ${validMinifigs.length} minifigs in the background...`
      );

      // Start the API request but don't block UI rendering
      apiFetch(`/bricklink/price`, {
        method: "POST",
        body: JSON.stringify(validMinifigs),
      }).then(async (data) => {
        if (data.error) {
          console.warn(
            "Background price fetch encountered an issue:",
            data.error
          );
          return;
        }
      });
    } catch (error) {
      console.error("Error fetching price data:", error);
    }
  };

  /**
   * Handles exporting data to a JSON file
   */
  const handleExportWrapper = () => {
    try {
      const currentPieces = piecesByTable[selectedTable?.id] || [];

      if (currentPieces.length === 0) {
        setExportStatus({
          success: false,
          message: "No pieces to export",
        });
        setTimeout(() => setExportStatus({ success: null, message: "" }), 3000);
        return;
      }

      setExportStatus({ success: null, message: "Processing export..." });
      handleExport(currentPieces, isMinifig);

      setExportStatus({
        success: true,
        message: `Successfully exported ${currentPieces.length} ${
          isMinifig ? "minifigs" : "pieces"
        }!`,
      });
      setTimeout(() => setExportStatus({ success: null, message: "" }), 3000);
    } catch (error) {
      setExportStatus({
        success: false,
        message: `Export failed: ${error.message}`,
      });
      setTimeout(() => setExportStatus({ success: null, message: "" }), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1  gap-6">
      {/* Import Section */}
      <div className="bg-slate-800/70 p-5 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <VerticalAlignBottomRounded
            className="h-6 w-6 mr-2 text-blue-400"
            fontSize="large"
          />
          Import Data
        </h3>

        <p className="text-slate-300 mb-4">
          Import your LEGO {isMinifig ? "minifig" : "piece"} data from a
          previously exported JSON file. This will replace the{" "}
          {isMinifig ? "minifigs" : "pieces"} in the current table.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            id="importFile"
            accept=".json"
            onClick={(e) => {
              e.target.value = null; // Reset the file input value
            }}
            onChange={handleImportWrapper}
            className="hidden"
          />
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label
              htmlFor="importFile"
              className={`
        cursor-pointer font-medium py-2.5 px-4 rounded-lg transition-colors duration-300 flex items-center gap-2
        ${
          importStatus.message
            ? importStatus.success === null
              ? "bg-slate-700 text-slate-300" // Loading state
              : importStatus.success
              ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800/50" // Success state
              : "bg-rose-900/40 text-rose-300 border border-rose-800/50" // Error state
            : "bg-blue-600 hover:bg-blue-700 text-white" // Default state
        }
      `}
            >
              <ArrowDownwardRounded
                className="h-10 w-10 mr-2"
                fontSize="medium"
              />

              <span className="transition-colors duration-300">
                {importStatus.message || "Select file to Import"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-slate-800/70 p-5 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <SaveAltRounded
            className="h-6 w-6 mr-2 text-rose-400"
            fontSize="large"
          />
          Export Data
        </h3>

        <p className="text-slate-300 mb-4">
          Export your current LEGO {isMinifig ? "minifigs" : "pieces"} to a JSON
          file. This will export only the {isMinifig ? "minifigs" : "pieces"}{" "}
          from the currently selected table.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleExportWrapper}
            disabled={!!exportStatus.message}
            className={`font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center gap-2 text-left ${
              exportStatus.message
                ? exportStatus.success === null
                  ? "bg-slate-700 text-slate-300"
                  : exportStatus.success
                  ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800/50"
                  : "bg-rose-900/40 text-rose-300 border border-rose-800/50"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }
          `}
          >
            <SimCardDownloadRounded
              fontSize="medium"
              className="w-5 h-5 mr-2"
            />
            {exportStatus.message || "Export Current Table"}
          </button>
        </div>
      </div>
    </div>
  );
}
