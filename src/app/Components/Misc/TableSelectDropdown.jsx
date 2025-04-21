// src/app/Components/Misc/TableSelectDropdown.jsx

import React, { useState, useEffect, useRef } from "react";

// Icons
import {
  AddRounded,
  DeleteForever,
  ExpandMoreRounded,
  TableRowsRounded,
} from "@mui/icons-material";
import { useLegoState } from "@/Context/LegoStateContext";
import MinifigIcon from "./MinifigIcon";
import BrickIcon from "./BrickIcon";
import { useModalState } from "@/Context/ModalContext";

/**
 * A dropdown component that displays available tables with tabs to switch between minifig and regular tables
 *
 * @param {Object} props - Component props
 * @param {Function} props.setSearchNewPieceResult - Function to set search result (if needed)
 * @returns {JSX.Element} The rendered dropdown component
 */
export default function TableSelectDropdown() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const tableRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState("regular"); // "regular" or "minifig"
  const [prevActiveTab, setPrevActiveTab] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const { selectedTable, setSelectedTable, availableTables } = useLegoState();
  const { setAddShowModal, setShowDeleteTableModal } = useModalState();

  const dropdownRef = useRef(null);
  const regularTabContentRef = useRef(null);
  const minifigTabContentRef = useRef(null);

  // Separate tables into regular and minifig sections
  const regularTables = availableTables.filter((table) => !table.isMinifig);
  const minifigTables = availableTables.filter((table) => table.isMinifig);

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        tableRef.current &&
        !tableRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handle keyboard navigation for the entire dropdown
   */
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isDropdownOpen) return;

      const currentTables =
        activeTab === "regular" ? regularTables : minifigTables;

      // Down arrow - move down the list
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < currentTables.length - 1 ? prev + 1 : prev
        );
      }
      // Up arrow - move up the list
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
      // Tab - switch between tabs (only if not holding shift)
      else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        handleTabChange(activeTab === "regular" ? "minifig" : "regular");
      }
      // Shift+Tab - switch between tabs in reverse
      else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        handleTabChange(activeTab === "minifig" ? "regular" : "minifig");
      }
      // Enter - select current item
      else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < currentTables.length) {
          setSelectedTable(currentTables[selectedIndex]);
          setIsDropdownOpen(false);
        }
      }
      // Escape - close dropdown
      else if (e.key === "Escape") {
        e.preventDefault();
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("keydown", handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isDropdownOpen, activeTab, selectedIndex, regularTables, minifigTables]);

  /**
   * Handle tab animation when tab changes
   */
  useEffect(() => {
    if (prevActiveTab !== null && prevActiveTab !== activeTab) {
      setIsAnimating(true);
      // Animation duration should match CSS transition duration
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // 300ms matches the CSS transition
      return () => clearTimeout(timer);
    }
    setPrevActiveTab(activeTab);
  }, [activeTab, prevActiveTab]);

  /**
   * Handle table selection
   *
   * @param {Object} table - The selected table
   */
  const handleSelectResult = (table) => {
    setSelectedTable(table);
    setIsDropdownOpen(false);
  };

  /**
   * Switch between tabs with animation
   *
   * @param {string} tab - The tab to switch to
   */
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setPrevActiveTab(activeTab);
      setIsAnimating(true);
      setActiveTab(tab);
      // Reset selected index when switching tabs
      setSelectedIndex(-1);
    }
  };

  /**
   * Get CSS classes for tab content based on animation state
   *
   * @param {string} tabName - The name of the tab
   * @returns {string} CSS classes
   */
  const getTabClasses = (tabName) => {
    const isActive = tabName === activeTab;
    const wasActive = tabName === prevActiveTab && isAnimating;

    // Base classes with higher z-index
    const baseClasses =
      "absolute w-full transition-all duration-300 ease-in-out";

    if (isActive && isAnimating) {
      // Tab is becoming active
      return `${baseClasses} opacity-100 translate-x-0`;
    } else if (isActive && !isAnimating) {
      // Tab is active and not animating
      return `${baseClasses} opacity-100 translate-x-0`;
    } else if (wasActive) {
      // Tab was active and is being replaced
      return activeTab === "regular"
        ? `${baseClasses} opacity-0 translate-x-full`
        : `${baseClasses} opacity-0 -translate-x-full`;
    } else {
      // Inactive tab - position based on which tab it is
      return tabName === "regular"
        ? `${baseClasses} opacity-0 -translate-x-full pointer-events-none`
        : `${baseClasses} opacity-0 translate-x-full pointer-events-none`;
    }
  };

  /**
   * Handle mouse entering a table item - updates selected index
   *
   * @param {number} index - The index of the hovered item
   */
  const handleMouseEnter = (index) => {
    setSelectedIndex(index);
  };

  const handleAddTable = (isMinifig) => {
    setAddShowModal({
      show: true,
      isMinifig,
    });
  };

  const handleDeleteTable = () => setShowDeleteTableModal(true);

  /**
   * Toggle the dropdown open/closed state
   */
  const toggleDropdown = () => {
    const newState = !isDropdownOpen;
    setIsDropdownOpen(newState);

    // If opening, we want to make sure the current table type tab is active
    if (newState && selectedTable) {
      setActiveTab(selectedTable.isMinifig ? "minifig" : "regular");
    }
  };

  const enableDeleteMinifigTable =
    availableTables.filter((table) => table.isMinifig).length > 1;

  const enableDeletePieceTable =
    availableTables.filter((table) => !table.isMinifig).length > 1;

  return (
    <div className="w-full select-none">
      {/* Dropdown trigger button */}
      <div className="relative">
        <div
          ref={tableRef}
          id="select-table"
          onClick={toggleDropdown}
          tabIndex={0}
          className="w-full p-3 pl-11 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 transition-all duration-200 cursor-pointer"
        >
          {selectedTable?.name || "Select a table"}

          {/* Display indicator for table type */}
          {selectedTable && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-600">
              {selectedTable.isMinifig ? "Minifig" : "Piece/Set"}
            </span>
          )}
        </div>

        {/* Table icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
          {selectedTable?.isMinifig ? (
            <MinifigIcon className="h-5 w-5" />
          ) : (
            <TableRowsRounded />
          )}
        </div>

        {/* Dropdown arrow */}
        <div
          className={`pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform duration-100 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        >
          <ExpandMoreRounded className="h-5 w-5" fontSize="medium" />
        </div>

        {/* Dropdown content */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 z-[9999] mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden flex flex-col"
            style={{ maxHeight: "520px" }} // Increased maximum height
          >
            {/* Tabs */}
            <div className="flex border-b border-slate-600 shadow-btm flex-shrink-0">
              <button
                onClick={() => handleTabChange("regular")}
                className={`flex items-center gap-2 py-3 px-4 font-medium flex-1 transition-all duration-200 ${
                  activeTab === "regular"
                    ? "bg-slate-700 text-white border-b-2 border-blue-500 shadow-right"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <BrickIcon className="h-5 w-5" />
                Piece / Set
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-600">
                  {regularTables.length}
                </span>
                <div className="ml-auto">
                  <div
                    onClick={(e) => handleAddTable(false)}
                    className="w-7 h-7 flex items-center justify-center bg-blue-600/80 hover:bg-blue-700 text-white rounded transition-colors"
                    title="Add Piece Table"
                  >
                    <AddRounded className="" style={{ fontSize: "16px" }} />
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTabChange("minifig")}
                className={`flex items-center gap-2 py-3 px-4 font-medium flex-1 transition-all duration-200 ${
                  activeTab === "minifig"
                    ? "bg-slate-700 text-white border-b-2 border-blue-500 shadow-left"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <MinifigIcon className="h-5 w-5" />
                Minifig
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-600">
                  {minifigTables.length}
                </span>
                <div className="ml-auto">
                  <div
                    onClick={(e) => handleAddTable(true)}
                    className="w-7 h-7 flex items-center justify-center bg-blue-600/80 hover:bg-blue-700 text-white rounded transition-colors"
                    title="Add Minifig Table"
                  >
                    <AddRounded className="" style={{ fontSize: "16px" }} />
                  </div>
                </div>
              </button>
            </div>

            {/* Content area with fixed height */}
            <div
              className="relative overflow-hidden flex-grow"
              style={{ height: "300px" }}
            >
              {/* Regular Tables Content */}
              <div
                ref={regularTabContentRef}
                className={`${getTabClasses("regular")} h-full`}
              >
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 overflow-x-hidden">
                  {regularTables.length > 0 ? (
                    regularTables.map((table, index) => (
                      <div
                        key={`regular-${table.id}-${index}`}
                        onClick={() => handleSelectResult(table)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-700/50 ${
                          activeTab === "regular" && index === selectedIndex
                            ? "bg-blue-600/20 hover:bg-blue-600/30"
                            : "hover:bg-slate-700/70"
                        }`}
                        onMouseEnter={() => handleMouseEnter(index)}
                      >
                        <div className="flex flex-row flex-1 items-center min-w-0 justify-between">
                          <div className="flex flex-col">
                            <div className="font-medium text-slate-200 truncate">
                              {table?.name}{" "}
                            </div>
                            <div className="text-sm text-slate-400">
                              <div className="text-sm text-slate-400">
                                {table?.description ? (
                                  <span className="text-slate-400">
                                    {`${table?.description}`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    No description available
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {enableDeletePieceTable && (
                            <div className="ml-auto">
                              <div
                                onClick={handleDeleteTable}
                                className="w-7 h-7 flex items-center justify-center bg-rose-600/80 hover:bg-rose-700 text-white rounded transition-colors"
                                title="Delete Table"
                              >
                                <DeleteForever
                                  className=""
                                  style={{ fontSize: "16px" }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-slate-400 italic text-center">
                      No piece/set tables available
                    </div>
                  )}
                </div>
              </div>

              {/* Minifig Tables Content */}
              <div
                ref={minifigTabContentRef}
                className={`${getTabClasses("minifig")} h-full`}
              >
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 overflow-x-hidden">
                  {minifigTables.length > 0 ? (
                    minifigTables.map((table, index) => (
                      <div
                        key={`minifig-${table.id}-${index}`}
                        onClick={() => handleSelectResult(table)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-700/50 ${
                          activeTab === "minifig" && index === selectedIndex
                            ? "bg-blue-600/20 hover:bg-blue-600/30"
                            : "hover:bg-slate-700/70"
                        }`}
                        onMouseEnter={() => handleMouseEnter(index)}
                      >
                        <div className="flex flex-row flex-1 items-center min-w-0 justify-between">
                          <div className="flex flex-col">
                            <div className="font-medium text-slate-200 truncate">
                              {table?.name}{" "}
                            </div>
                            <div className="text-sm text-slate-400">
                              {table?.description ? (
                                <span className="text-slate-400">
                                  {`${table?.description}`}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">
                                  No description available
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-auto">
                            {enableDeleteMinifigTable && (
                              <div className="ml-auto">
                                <div
                                  onClick={handleDeleteTable}
                                  className="w-7 h-7 flex items-center justify-center bg-rose-600/80 hover:bg-rose-700 text-white rounded transition-colors"
                                  title="Delete Table"
                                >
                                  <DeleteForever
                                    className=""
                                    style={{ fontSize: "16px" }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-slate-400 italic text-center">
                      No minifig tables available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tab switching hint */}
            <div className="py-2 px-4 text-xs text-slate-400 border-t border-slate-700 bg-slate-800/80 shadow-top flex-shrink-0">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600 mr-1">
                Tab
              </kbd>
              to switch tabs
              <span className="mx-2">•</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600 mr-1">
                ↑/↓
              </kbd>
              to navigate
              <span className="mx-2">•</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600 mr-1">
                Enter
              </kbd>
              to select
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
