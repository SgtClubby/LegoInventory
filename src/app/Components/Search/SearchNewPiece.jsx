// src/app/Components/Search/SearchNewPiece.jsx

// Functions and Helpers
import React, { useState, useEffect, useRef } from "react";

// Icons
import {
  ArrowCircleDownRounded,
  ClearRounded,
  InsertPhotoRounded,
  SearchRounded,
} from "@mui/icons-material";
import LoaderIcon from "@/Components/Misc/LoaderIcon";

export default function SearchNewPiece({ setSearchNewPieceResult }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeout = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle search term changes with debounce
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    setIsLoading(true);

    // Set new timeout for debounced search
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/part/${searchTerm}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
          },
        });

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          setResults(data.results);
          setIsDropdownOpen(true);
          setSelectedIndex(-1); // Reset selected index on new results
        } else {
          setResults([]);
          setIsDropdownOpen(false);
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
        setResults([]);
        setIsDropdownOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;

    // Down arrow - move down the list
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    }
    // Up arrow - move up the list
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }
    // Enter - select current item
    else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectResult(results[selectedIndex]);
      }
    }
    // Escape - close dropdown
    else if (e.key === "Escape") {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
  };

  // Handle result selection
  const handleSelectResult = (result) => {
    setSearchNewPieceResult(result);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  return (
    <div className="w-full">
      <label
        htmlFor="search-new-piece"
        className="block text-sm font-medium mb-1.5 text-slate-300"
      >
        Search for a piece
      </label>

      <div className="relative">
        {/* Search input */}
        <div className="relative">
          <input
            ref={inputRef}
            id="search-new-piece"
            type="text"
            placeholder="Search by name or ID (e.g., 'Brick 2x4' or '3001')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setIsDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 pl-10 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          {/* Search icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            {isLoading ? (
              <LoaderIcon />
            ) : (
              <SearchRounded className="h-5 w-5" fontSize="medium" />
            )}
          </div>

          {/* Clear button */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ClearRounded className="h-5 w-5" fontSize="medium" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-600"
          >
            <div className="py-1 divide-y divide-slate-700">
              {results.map((item, index) => (
                <div
                  key={item.part_num + "-" + index}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                    index === selectedIndex
                      ? "bg-blue-600/20 hover:bg-blue-600/30"
                      : "hover:bg-slate-700/70"
                  }`}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {item.part_img_url ? (
                    <img
                      src={item.part_img_url}
                      alt={item.name}
                      className="w-12 h-12 object-cover bg-slate-700 rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-700 rounded flex items-center justify-center">
                      <InsertPhotoRounded className="h-6 w-6 text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 truncate">
                      {item.name}
                    </div>
                    <div className="text-sm text-slate-400">
                      ID: {item.part_num}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-blue-400">
                    <ArrowCircleDownRounded className="h-6 w-6" />
                  </div>
                </div>
              ))}
            </div>

            {/* Loader at the bottom of the list */}
            {isLoading && (
              <div className="px-4 py-3 text-center text-slate-400">
                <div className="inline-block animate-spin mr-2 h-4 w-4 border-t-2 border-blue-500 rounded-full"></div>
                Loading more results...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="mt-2 text-xs text-slate-400">
        Start typing to search for LEGO pieces by name or ID. Use arrow keys to
        navigate and Enter to select.
      </p>
    </div>
  );
}
