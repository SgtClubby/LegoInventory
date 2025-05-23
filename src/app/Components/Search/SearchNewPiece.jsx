// src/app/Components/Search/SearchNewPiece.jsx

/**
 * A component for searching for new pieces with enhanced keyboard navigation
 *
 * @param {Object} props - Component props
 * @param {Function} props.setSearchNewPieceResult - Function to set the selected piece
 * @returns {JSX.Element} The rendered search component
 */
import React, { useState, useEffect, useRef } from "react";

// Icons
import {
  ArrowCircleDownRounded,
  ClearRounded,
  InsertPhotoRounded,
  SearchRounded,
} from "@mui/icons-material";
import LoaderIcon from "@/Components/Misc/LoaderIcon";
import { apiFetch } from "@/lib/API/client/apiFetch";

export default function SearchNewPiece({ setSearchNewPieceResult }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeout = useRef(null);

  /**
   * Handle click outside to close dropdown
   */
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

  /**
   * Global keyboard navigation handler - works even when focus is elsewhere
   */
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isDropdownOpen) return;

      // Down arrow - move down the list
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
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

    if (isDropdownOpen) {
      document.addEventListener("keydown", handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isDropdownOpen, selectedIndex, results]);

  /**
   * Handle search term changes with debounce
   */
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
        const data = await apiFetch(`/search/part/${searchTerm}`, {
          method: "GET",
        });

        if (data && data.length > 0) {
          setResults(data);
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

  /**
   * Handle result selection
   *
   * @param {Object} result - The selected search result
   */
  const handleSelectResult = (result) => {
    setSearchNewPieceResult(result);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  /**
   * Clear search input
   */
  const clearSearch = () => {
    setSearchTerm("");
    inputRef.current.focus();
  };

  return (
    <div className="select-none">
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
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Search by name or ID (e.g., 'Brick 2x4' or '3001')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setIsDropdownOpen(true)}
            className="w-full p-3 pl-10 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />

          {/* Search icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            {isLoading ? (
              <LoaderIcon className="h-5 w-5" />
            ) : (
              <SearchRounded className="h-5 w-5" fontSize="medium" />
            )}
          </div>

          {/* Clear button */}
          {searchTerm && (
            <button
              onClick={clearSearch}
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
            className="absolute left-0 z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden flex flex-col"
            style={{ maxHeight: "480px" }}
          >
            {/* Scrollable results area */}
            <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-600 flex-grow">
              <div className="py-1 divide-y divide-slate-700">
                {results.map((element, index) => (
                  <div
                    key={element.elementId + "-" + index}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                      index === selectedIndex
                        ? "bg-emerald-600/20 hover:bg-emerald-600/30"
                        : "hover:bg-slate-700/70"
                    }`}
                    onClick={() => handleSelectResult(element)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {element.elementImage ? (
                      <img
                        src={element.elementImage}
                        alt={element.elementName}
                        className="w-12 h-12 object-cover bg-slate-700 rounded"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-700 rounded flex items-center justify-center">
                        <InsertPhotoRounded className="h-6 w-6 text-slate-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-200 truncate">
                        {element.elementName}
                      </div>
                      <div className="text-sm text-slate-400">
                        ID: {element.elementId}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-emerald-400">
                      <ArrowCircleDownRounded className="h-6 w-6" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Loader inside scrollable area */}
              {isLoading && (
                <div className="px-4 py-3 text-center text-slate-400">
                  <div className="inline-block animate-spin mr-2 h-4 w-4 border-t-2 border-emerald-500 rounded-full"></div>
                  Loading more results...
                </div>
              )}
            </div>

            {/* Keyboard navigation hint - fixed at bottom */}
            <div className="py-2 px-4 text-xs text-slate-400 border-t border-slate-700 bg-slate-800 shadow-top sticky bottom-0">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600 mr-1">
                ↑/↓
              </kbd>
              to navigate
              <span className="mx-2">•</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600 mr-1">
                Enter
              </kbd>
              to select
              <span className="mx-2">•</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded border border-slate-600 mr-1">
                Esc
              </kbd>
              to close
            </div>
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
