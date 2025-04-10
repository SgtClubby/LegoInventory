// src/app/components/Main/MainApp.jsx

"use client";
import React, { useState, useEffect } from "react";

// Components
import Header from "@/components/Misc/Header";
import PieceTable from "@/components/Table/PieceTable";
import Statistics from "@/components/Misc/Statistics";
import SearchSet from "@/components/Search/SearchSet";
import ImportModal from "@/components/Modals/ImportModal";
import ImportExport from "@/components/Misc/ImportExport";

// Functions & Helpers
import { fetchPiecesFromTable } from "@/lib/Pieces/PiecesManager";
import useInit from "@/hooks/useInit";
import AddNewPieceForm from "./AddNewPieceForm";

// ===================
// Main Component
// ===================
const MainApp = () => {
  // Modal state for set import
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // ---------------------------
  // Initialization: Load Images & Tables
  // ---------------------------
  const { piecesByTable, setPiecesByTable, selectedTable } = useInit();

  // ---------------------------
  // Handle import modal
  // ---------------------------
  useEffect(() => {
    if (searchResult && searchResult.set_num) {
      setShowImportModal(true);
    }
  }, [searchResult]);

  // ---------------------------
  // Fetch pieces when selected table changes
  // ---------------------------

  useEffect(() => {
    if (selectedTable) {
      console.log(`Fetching pieces for table ${selectedTable.id}...`);
      fetchPiecesFromTable(selectedTable.id)
        .then((savedData) => {
          if (savedData) {
            setPiecesByTable((prev) => ({
              ...prev,
              [selectedTable.id]: savedData,
            }));
            console.log(
              `Fetched ${savedData.length} pieces for table ${selectedTable.id}`
            );
          }
        })
        .catch((error) => {
          console.error(
            `Failed to fetch pieces for table ${selectedTable.id}:`,
            error
          );
        });
    }
  }, [selectedTable]);

  // ============================
  // Render Component
  // ============================
  return (
    <div className="mx-auto p-4 bg-slate-700 min-h-screen">
      <Header />
      {/* Import and Export */}
      <ImportExport />
      {/* Add New Piece Form */}
      <div className="bg-slate-800 p-4 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-gray-100 font-semibold">Add New Piece</h2>
          <SearchSet setSetSearchResult={setSearchResult} />
        </div>
        <AddNewPieceForm />
      </div>

      {/* Pieces Table */}
      <PieceTable
        setPieces={(newPieces) => {
          setPiecesByTable((prev) => ({
            ...prev,
            [selectedTable.id]: newPieces,
          }));
        }}
      />

      {/* Statistics */}
      <Statistics pieces={piecesByTable[selectedTable?.id] || []} />

      {/* Import Set Modal */}
      {showImportModal && (
        <ImportModal
          toggleModal={setShowImportModal}
          searchResult={searchResult}
          setSearchResult={setSearchResult}
        />
      )}
    </div>
  );
};

export default MainApp;
