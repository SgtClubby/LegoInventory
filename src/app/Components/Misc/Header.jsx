// src/app/Components/Misc/Header.jsx

import React from "react";
import { useLego } from "@/Context/LegoContext";
import {
  ChecklistRtlRounded,
  FormatListBulletedRounded,
} from "@mui/icons-material";

export default function Header() {
  const { piecesByTable, selectedTable } = useLego();

  // Calculate stats for the whole collection
  const totalPieces = Object.values(piecesByTable).reduce(
    (total, tablePieces) => total + tablePieces.length,
    0
  );

  const totalTables = Object.keys(piecesByTable).length;

  // Calculate stats for the current table
  const currentTablePieces = selectedTable
    ? piecesByTable[selectedTable.id]?.length || 0
    : 0;

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center">
          <div className="mr-3 bg-slate-700 p-2 rounded-lg">
            <img src="/lego_logo.png" alt="LEGO Logo" className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              LEGO Piece Manager
            </h1>
            <p className="text-slate-300 text-sm">
              Organize, track, and manage your LEGO collection
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="px-4 py-2 bg-slate-800/80 rounded-lg border border-slate-700 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-sm text-slate-300">
              Tables: {totalTables}
            </span>
          </div>

          <div className="px-4 py-2 bg-slate-800/80 rounded-lg border border-slate-700 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-slate-300">
              Pieces: {totalPieces}
            </span>
          </div>
        </div>
      </div>

      {/* Current table info */}
      {selectedTable && (
        <div className="bg-slate-800/40 py-3 px-4 rounded-lg border border-slate-700/50 flex flex-wrap items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <FormatListBulletedRounded className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-white">Current Table:</span>
              <span className="text-slate-300">{selectedTable.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <ChecklistRtlRounded className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-white">Table Type:</span>
              <span className="text-slate-300">
                {selectedTable?.isMinifig ? "Minifigs" : "Pieces/Sets"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <span className="px-3 py-1 bg-slate-700/60 rounded-full">
              {currentTablePieces}{" "}
              {selectedTable.isMinifig
                ? "Minifigs"
                : currentTablePieces === 1
                ? "piece"
                : "pieces"}
            </span>
            <span className="px-3 py-1 bg-slate-700/60 rounded-full">
              ID: {selectedTable.id}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
