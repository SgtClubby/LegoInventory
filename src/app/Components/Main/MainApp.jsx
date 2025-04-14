// src/app/Components/Main/MainApp.jsx

"use client";
import React, { useState, useEffect } from "react";

// Components
import Header from "@/Components/Misc/Header";
import PieceTable from "@/Components/Table/PieceTable";
import SearchSet from "@/Components/Search/SearchSet";
import ImportModal from "@/Components/Modals/ImportModal";
import ImportExport from "@/Components/Misc/ImportExport";
import AddNewPieceForm from "./AddNewPieceForm";

// Functions & Helpers
import { fetchPiecesFromTable } from "@/lib/Pieces/PiecesManager";
import useInit from "@/hooks/useInit";
import {
  Add,
  FilterListRounded,
  ImportExportRounded,
  VerticalAlignBottomRounded,
} from "@mui/icons-material";
import Footer from "../Misc/Footer";
import { useLego } from "@/Context/LegoContext";

const MainApp = () => {
  // Modal state for set import
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const { activeTab, setActiveTab } = useLego();

  // Initialization: Load Tables
  const { setPiecesByTable, selectedTable } = useInit();

  // Handle import modal
  useEffect(() => {
    if (searchResult && searchResult.set_num) {
      setShowImportModal(true);
    }
  }, [searchResult]);

  // Fetch pieces when selected table changes
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-[100rem] w-full mx-auto p-4 md:p-8">
        {/* Header */}
        <Header />
    
        {/* Main Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 h ">
          <div
            className={`p-3 md:p-5 rounded-xl border ${
              activeTab === "all"
                ? "bg-blue-600/30 border-blue-500"
                : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
            } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
            onClick={() => setActiveTab("all")}
          >
            <FilterListRounded className="h-7 w-7 mb-2" fontSize="large" />

            <span className="font-medium">Browse All Pieces</span>
          </div>

          <div
            className={`p-3 md:p-5 rounded-xl border ${
              activeTab === "add"
                ? "bg-emerald-600/30 border-emerald-500"
                : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
            } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
            onClick={() => setActiveTab("add")}
          >
            <Add className="h-7 w-7 mb-2" fontSize="large" />
            <span className="font-medium">Add New Piece</span>
          </div>

          <div
            className={`p-3 md:p-5 rounded-xl border ${
              activeTab === "import"
                ? "bg-amber-600/30 border-amber-500"
                : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
            } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
            onClick={() => setActiveTab("import")}
          >
            <VerticalAlignBottomRounded
              className="h-7 w-7 mb-2"
              fontSize="large"
            />
            <span className="font-medium">Import Set</span>
          </div>

          <div
            className={`p-3 md:p-5 rounded-xl border ${
              activeTab === "export"
                ? "bg-rose-600/30 border-rose-500"
                : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
            } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
            onClick={() => setActiveTab("export")}
          >
            <ImportExportRounded className="h-20 w-20 mb-2" fontSize="large" />
            <span className="font-medium">Import/Export</span>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "all" && (
          <PieceTable
            setPieces={(newPieces) => {
              setPiecesByTable((prev) => ({
                ...prev,
                [selectedTable.id]: newPieces,
              }));
            }}
          />
        )}

        {activeTab === "add" && <AddNewPieceForm />}

        {activeTab === "import" && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-6">
                Import Set
              </h2>
              <p className="text-slate-300 mb-6">
                Search for a LEGO set by name or set number to import all its
                pieces into a new table.
              </p>
              <SearchSet setSetSearchResult={setSearchResult} />

              <div className="mt-8 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h3 className="text-lg font-medium mb-2 text-slate-200">
                  How it works:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>Search for a set by name or set number</li>
                  <li>Select the set from the search results</li>
                  <li>Confirm the import in the dialog</li>
                  <li>
                    A new table will be created with all pieces from the set
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {activeTab === "export" && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-6">
                Import/Export Data
              </h2>
              <p className="text-slate-300 mb-6">
                Export your current piece data to JSON or import previously
                exported data.
              </p>
              <ImportExport />

              <div className="mt-8 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h3 className="text-lg font-medium mb-2 text-slate-200">
                  Notes:
                </h3>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  <li>Exported files are in JSON format</li>
                  <li>Import will replace all pieces in the current table</li>
                  <li>You can share exported files with other LEGO builders</li>
                  <li>Make regular backups of your collections</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Import Set Modal */}
        {showImportModal && (
          <ImportModal
            toggleModal={setShowImportModal}
            searchResult={searchResult}
            setSearchResult={setSearchResult}
          />
        )}
      </div>
      {/* Footer */}
      <div className="flex-grow mt-16 switch:mt-0" />
      <Footer className="items-end" />
    </div>
  );
};

export default MainApp;
