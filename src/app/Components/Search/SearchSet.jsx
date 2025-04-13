// src/app/Components/Search/SearchSet.jsx

import React, { useState, useEffect, useRef } from "react";

export default function SearchSet({ setSetSearchResult }) {
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
        const response = await fetch(`/api/search/set/${searchTerm}`, {
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
    setSetSearchResult(result);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  return (
    <div className="w-full">
      <label
        htmlFor="search-set"
        className="block text-sm font-medium mb-1.5 text-slate-300"
      >
        Search for a LEGO set
      </label>

      <div className="relative">
        {/* Search input */}
        <div className="relative">
          <input
            ref={inputRef}
            id="search-set"
            type="text"
            placeholder="Search by name or set number (e.g., 'Star Wars' or '75192')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setIsDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 pl-10 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-colors duration-200"
          />

          {/* Search icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Clear button */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-96 overflow-auto scrollbar-thin scrollbar-thumb-slate-600 animate-fadeIn"
          >
            <div className="py-1 divide-y divide-slate-700">
              {results.map((item, index) => (
                <div
                  key={item.set_num}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-200 ${
                    index === selectedIndex
                      ? "bg-amber-600/20 hover:bg-amber-600/30"
                      : "hover:bg-slate-700/70"
                  }`}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {item.set_img_url ? (
                    <img
                      src={item.set_img_url}
                      alt={item.name}
                      className="w-14 h-14 object-contain bg-slate-700 rounded"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-slate-700 rounded flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 truncate">
                      {item.name}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="text-slate-400">
                        Set: {item.set_num}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400">Year: {item.year}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400">
                        Pieces: {item.num_parts}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-amber-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Loader at the bottom of the list */}
            {isLoading && (
              <div className="px-4 py-3 text-center text-slate-400">
                <div className="inline-block animate-spin mr-2 h-4 w-4 border-t-2 border-amber-500 rounded-full"></div>
                Loading more results...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="mt-2 text-xs text-slate-400">
        Start typing to search for LEGO sets by name or set number. Select a set
        to import all its pieces to a new table.
      </p>
    </div>
  );
}
