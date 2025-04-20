// src/app/Components/Misc/ImportExport.jsx

import React, { useState } from "react";
import { useLego } from "@/Context/LegoContext";
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

export default function ImportExport() {
  const { piecesByTable, setPiecesByTable, selectedTable } = useLego();
  const isMinifig = selectedTable?.isMinifig;
  const [importStatus, setImportStatus] = useState({
    success: null,
    message: "",
  });
  const [exportStatus, setExportStatus] = useState({
    success: null,
    message: "",
  });

  const handleImportWrapper = (event) => {
    try {
      setImportStatus({ success: null, message: "Processing import..." });

      handleImport(event, (importedData) => {
        console.log(importedData);
        const importType = detectStructureType(importedData);

        console.log(importType);

        const isImportMinifig = importedData.some(
          (piece) => piece.isMinifig === true
        );

        importedData = importedData.map((piece) => {
          delete piece.isMinifig; // Remove isMinifig identity property from imported data
          return {
            ...piece,
            tableId: selectedTable.id,
            ownerId: selectedTable.ownerId,
            highlighted: false,
          };
        });

        if (isImportMinifig !== isMinifig) {
          setImportStatus({
            success: false,
            // it has to be short
            message: `Fail: This table is for ${
              isMinifig ? "minifigs" : "pieces"
            } only!`,
          });

          // Reset error status after 5 seconds
          setTimeout(
            () => setImportStatus({ success: null, message: "" }),
            5000
          );
          return;
        }

        setPiecesByTable((prev) => ({
          ...prev,
          [selectedTable.id]: importedData,
        }));

        setImportStatus({
          success: true,
          message: `Successfully imported ${importedData.length} ${
            isMinifig ? "minifigs" : "pieces"
          }!`,
        });

        // Reset status after 3 seconds
        setTimeout(() => setImportStatus({ success: null, message: "" }), 3000);
      });
    } catch (error) {
      setImportStatus({
        success: false,
        message: `Import failed: ${error.message}`,
      });

      // Reset status after 3 seconds
      setTimeout(() => setImportStatus({ success: null, message: "" }), 3000);
    }
  };

  const handleExportWrapper = () => {
    try {
      const currentPieces = piecesByTable[selectedTable?.id] || [];

      if (currentPieces.length === 0) {
        setExportStatus({
          success: false,
          message: "No pieces to export",
        });

        // Reset status after 3 seconds
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

      // Reset status after 3 seconds
      setTimeout(() => setExportStatus({ success: null, message: "" }), 3000);
    } catch (error) {
      setExportStatus({
        success: false,
        message: `Export failed: ${error.message}`,
      });

      // Reset status after 3 seconds
      setTimeout(() => setExportStatus({ success: null, message: "" }), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
