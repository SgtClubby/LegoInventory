// src/app/Components/Main/MainApp.jsx

"use client";
import React, { useState, useEffect, useRef } from "react";

// Components
import Header from "@/Components/Misc/Header";
import PieceTable from "@/Components/Table/PieceTable";
import SearchSet from "@/Components/Search/SearchSet";
import ImportSetModal from "@/Components/Modals/ImportSetModal";
import ImportExport from "@/Components/Misc/ImportExport";
import AddNewPieceForm from "./AddNewPieceForm";
import TableAddModal from "@/Components/Modals/TableAddModal";
import TableDeleteModal from "@/Components/Modals/TableDeleteModal";

// Functions & Helpers
import { fetchTable } from "@/lib/Pieces/PiecesManager";
import useInit from "@/hooks/useInit";
import {
  Add,
  FilterListRounded,
  ImportExportRounded,
  VerticalAlignBottomRounded,
} from "@mui/icons-material";
import Footer from "../Misc/Footer";
import { useLego } from "@/Context/LegoContext";
import DeletePieceModal from "../Modals/DeletePieceModal";

/**
 * Main application component for the Lego manager
 *
 * @returns {JSX.Element} The rendered component
 */
const MainApp = () => {
  // Modal state for set import
  const [searchResult, setSearchResult] = useState(null);
  const [prevActiveTab, setPrevActiveTab] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [containerHeight, setContainerHeight] = useState("auto");

  const contentRefs = useRef({
    all: useRef(null),
    add: useRef(null),
    import: useRef(null),
    export: useRef(null),
  });

  const {
    activeTab,
    setActiveTab,
    setShowImportModal,
    showImportModal,
    showAddModal,
    setAddShowModal,
    showDeleteModal,
    setDeleteShowModal,
    deleteModalOpen,
    setDeleteModalOpen,
    pieceToDelete,
  } = useLego();

  const tabOrder = ["all", "add", "import", "export"];
  // Initialization: Load Tables
  const { setPiecesByTable, selectedTable, piecesByTable } = useInit();
  const isMinifig = selectedTable?.isMinifig;

  // screen width
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    // Initial call just in case
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Measure and update container height when tab changes, this should also fire when screen width changes
  useEffect(() => {
    setContainerHeight(800);

    const activeContent = contentRefs.current[activeTab]?.current;
    if (activeContent) {
      const height = activeContent.scrollHeight;
      setContainerHeight(height + 75);
    }
  }, [activeTab, selectedTable, piecesByTable, screenWidth]);

  // Handle tab changes with animation
  useEffect(() => {
    if (prevActiveTab !== null && prevActiveTab !== activeTab) {
      setIsAnimating(true);
      // Animation duration should match CSS transition duration
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500); // 500ms matches the CSS transition
      return () => clearTimeout(timer);
    }
    setPrevActiveTab(activeTab);
  }, [activeTab, prevActiveTab]);

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
      fetchTable(selectedTable.id)
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

  /**
   * Handle tab change with animation
   *
   * @param {string} tab - The tab to switch to
   */
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setPrevActiveTab(activeTab);
      setIsAnimating(true);
      setActiveTab(tab);
    }
  };

  const getAnimationDirection = (fromTab, toTab) => {
    if (!fromTab || !toTab) return "right"; // Default direction

    const fromIndex = tabOrder.indexOf(fromTab);
    const toIndex = tabOrder.indexOf(toTab);

    // If moving to a tab that's later in the order, go right
    // If moving to a tab that's earlier in the order, go left
    return fromIndex < toIndex ? "right" : "left";
  };

  const getTabClasses = (tabName) => {
    const isActive = tabName === activeTab;
    const wasActive = tabName === prevActiveTab && isAnimating;
    const direction = getAnimationDirection(prevActiveTab, activeTab);

    // Base classes without padding (padding will be part of child containers)
    const baseClasses = "absolute w-full transition-all duration-500";

    if (isActive && isAnimating) {
      // Tab is becoming active
      if (direction === "right") {
        // Slide in from right when moving forward
        return `${baseClasses} opacity-100 md:translate-x-0 translate-y-0`;
      } else {
        // Slide in from left when moving backward
        return `${baseClasses} opacity-100 md:translate-x-0 translate-y-0`;
      }
    } else if (isActive && !isAnimating) {
      // Tab is active and not animating
      return `${baseClasses} opacity-100 md:translate-x-0 translate-y-0`;
    } else if (wasActive) {
      // Tab was active and is being replaced
      if (direction === "right") {
        // Slide out to left when moving forward
        return `${baseClasses} opacity-0 md:-translate-x-full translate-y-full md:translate-y-0`;
      } else {
        // Slide out to right when moving backward
        return `${baseClasses} opacity-0 md:translate-x-full -translate-y-full md:-translate-y-0`;
      }
    } else {
      // Inactive tab - position based on direction relative to active tab
      const tabIndex = tabOrder.indexOf(tabName);
      const activeIndex = tabOrder.indexOf(activeTab);

      // If this tab is to the left of the active tab, position it left
      // Otherwise, position it right
      return tabIndex < activeIndex
        ? `${baseClasses} opacity-0 md:-translate-x-full translate-y-full md:translate-y-0 pointer-events-none`
        : `${baseClasses} opacity-0 md:translate-x-full -translate-y-full md:translate-y-0 pointer-events-none`;
    }
  };

  // console.log(piecesByTable);
  // console.log(selectedTable);
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-[100rem] w-full mx-auto p-4 md:p-8 h-full">
        {/* Header */}
        <Header />

        {/* Main Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className={`p-3 md:p-5 rounded-xl border ${
              activeTab === "all"
                ? "bg-blue-600/30 border-blue-500"
                : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
            } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
            onClick={() => handleTabChange("all")}
          >
            <FilterListRounded className="h-7 w-7 mb-2" fontSize="large" />

            <span className="font-medium">
              {selectedTable?.isMinifig ? "Browse Minifigs" : "Browse Pieces"}
            </span>
          </div>

          <div
            className={`p-3 md:p-5 rounded-xl border ${
              activeTab === "add"
                ? "bg-emerald-600/30 border-emerald-500"
                : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
            } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
            onClick={() => handleTabChange("add")}
          >
            <Add className="h-7 w-7 mb-2" fontSize="large" />
            <span className="font-medium">
              {selectedTable?.isMinifig ? "Add New Minifig" : "Add New Piece"}
            </span>
          </div>

          <div
            className={`p-3 md:p-5 rounded-xl border ${
              activeTab === "import"
                ? "bg-amber-600/30 border-amber-500"
                : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
            } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
            onClick={() => handleTabChange("import")}
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
            onClick={() => handleTabChange("export")}
          >
            <ImportExportRounded className="h-7 w-7 mb-2" fontSize="large" />
            <span className="font-medium">Import/Export</span>
          </div>
        </div>

        {/* Tab Content Container - Dynamic height with overflow hidden during transitions */}
        <div
          className={`relative overflow-hidden transition-all duration-150 z-300`}
          style={{
            height: containerHeight,
          }}
        >
          {/* All Pieces Tab */}
          <div ref={contentRefs.current.all} className={getTabClasses("all")}>
            <PieceTable
              setPieces={(newPieces) => {
                setPiecesByTable((prev) => ({
                  ...prev,
                  [selectedTable.id]: newPieces,
                }));
              }}
            />
          </div>

          {/* Add New Piece Tab */}
          <div ref={contentRefs.current.add} className={getTabClasses("add")}>
            <AddNewPieceForm />
          </div>

          {/* Import Set Tab */}
          <div
            ref={contentRefs.current.import}
            className={getTabClasses("import")}
          >
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
          </div>

          {/* Export Data Tab */}
          <div
            ref={contentRefs.current.export}
            className={getTabClasses("export")}
          >
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-semibold text-white mb-6">
                  Import/Export Data
                </h2>
                <p className="text-slate-300 mb-6">
                  Export your current {isMinifig ? "minifig" : "piece"} data to
                  JSON or import previously exported data.
                </p>
                <ImportExport />

                <div className="mt-8 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <h3 className="text-lg font-medium mb-2 text-slate-200">
                    Notes:
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300">
                    <li>Exported files are in JSON format</li>
                    <li>
                      Import will replace all{" "}
                      {isMinifig ? "minifigs" : "pieces"} in the current table
                    </li>
                    <li>
                      You can share exported files with other LEGO builders
                    </li>
                    <li>Make regular backups of your collections</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showAddModal.show && <TableAddModal toggleModal={setAddShowModal} />}
      {/* Modal for deleting a table */}
      {showDeleteModal && <TableDeleteModal toggleModal={setDeleteShowModal} />}
      {/* Import Set Modal */}
      {showImportModal && (
        <ImportSetModal
          toggleModal={setShowImportModal}
          searchResult={searchResult}
          setSearchResult={setSearchResult}
        />
      )}
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && pieceToDelete && (
        <DeletePieceModal toggleModal={setDeleteModalOpen} />
      )}
      {/* Footer */}
      <div className="flex-grow mt-16 switch:mt-0" />
      <Footer className="items-end" />
    </div>
  );
};

export default MainApp;
