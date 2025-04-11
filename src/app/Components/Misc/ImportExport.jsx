// src/app/components/Misc/ImportExport.jsx

import { useLego } from "@/Context/LegoContext";
import { handleExport, handleImport } from "@/lib/Misc/ImportExport";

export default function ImportExport() {
  const { piecesByTable, setPiecesByTable, selectedTable } = useLego();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex gap-2">
        <input
          type="file"
          id="importFile"
          accept=".json"
          onChange={(event) =>
            handleImport(event, (importedData) => {
              setPiecesByTable((prev) => ({
                ...prev,
                [selectedTable.id]: importedData,
              }));
            })
          }
          className="hidden"
        />
        <label htmlFor="importFile" className="blue-btn">
          Import
        </label>
        <button
          onClick={handleExport.bind(
            null,
            piecesByTable[selectedTable?.id] || []
          )}
          className="red-btn bg-red-500 hover:bg-red-600"
        >
          Export
        </button>
      </div>
    </div>
  );
}
