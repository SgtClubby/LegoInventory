// src/app/Components/Misc/TableSelectDropdown.jsx

// Functions and Helpers
import React, { useState, useEffect, useRef } from "react";

// Icons
import {
  ClearRounded,
  ExpandMoreRounded,
  TableRowsRounded,
} from "@mui/icons-material";
import { useLego } from "@/Context/LegoContext";

export default function TableSelectDropdown({ setSearchNewPieceResult }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const tableRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const { selectedTable, setSelectedTable, availableTables } = useLego();

  const dropdownRef = useRef(null);

  // Handle click outside to close dropdown
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

  // Handle select
  const handleSelectResult = (table) => {
    setSelectedTable(table);
    setIsDropdownOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;

    // Down arrow - move down the list
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < availableTables.length - 1 ? prev + 1 : prev
      );
    }
    // Up arrow - move up the list
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }
    // Enter - select current item
    else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < availableTables.length) {
        setSelectedTable(availableTables[selectedIndex]);
      }
    }
    // Escape - close dropdown
    else if (e.key === "Escape") {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="w-full">
      {/* Help text */}
      <div className="relative">
        {/* Search input */}
        <div className="relative">
          <div
            ref={tableRef}
            id="select-table"
            onKeyDown={handleKeyDown}
            onClick={() =>
              setIsDropdownOpen(!isDropdownOpen) && tableRef.current.focus()
            }
            className="w-full p-3 pl-11 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 transition-all duration-200"
          >
            {selectedTable?.name || "Select a table"}
          </div>
        </div>
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
          <TableRowsRounded />
        </div>
        <div
          className={`pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform duration-100 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        >
          <ExpandMoreRounded className="h-5 w-5 " fontSize="medium" />
        </div>

        {/* Dropdown results */}
        {isDropdownOpen && (
          <div
            key={selectedTable?.id}
            ref={dropdownRef}
            className="absolute left-0 z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-600"
          >
            <div className=" divide-y divide-slate-700">
              {availableTables.map((table, index) => (
                <div
                  key={table.id + "-" + index + "-" + table.name}
                  onClick={() => handleSelectResult(table)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                    index === selectedIndex
                      ? "bg-blue-600/20 hover:bg-blue-600/30"
                      : "hover:bg-slate-700/70"
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 truncate">
                      {table?.name}{" "}
                      <span className="text-xs text-slate-400">
                        {`${!table?.description ? `- (ID: ${table?.id})` : ""}`}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">
                      {`${
                        table?.description
                          ? `(ID: ${table?.id}) - ${table?.description}`
                          : ""
                      }`}
                    </div>
                    <div className="text-sm text-slate-400"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
