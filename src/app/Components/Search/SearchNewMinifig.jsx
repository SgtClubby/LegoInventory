// src/app/Components/Search/SearchNewMinifig.jsx

/**
 * Component for searching and selecting minifigs with enhanced keyboard navigation
 *
 * @param {Object} props - Component props
 * @param {Function} props.setSearchNewMinifigResult - Function to set the selected minifig result
 * @param {Object} props.searchNewMinifigResult - Currently selected minifig result
 * @returns {JSX.Element} The rendered search component
 */
import { useState, useRef, useEffect } from "react";
import { debounce } from "lodash";
import { Search } from "@mui/icons-material";
import { ArrowCircleDownRounded, ClearRounded } from "@mui/icons-material";
import LoaderIcon from "@/Components/Misc/LoaderIcon";
import { apiFetch } from "@/lib/API/client/apiFetch";

export default function SearchNewMinifig({
  setSearchNewMinifigResult,
  searchNewMinifigResult,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const latestRequestId = useRef(0);

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * Global keyboard navigation handler
   */
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!isDropdownOpen || results.length === 0) return;

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
          handleSelectMinifig(results[selectedIndex]);
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
   * Clear results when query is cleared
   */
  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsDropdownOpen(false);
    } else if (query.length < 3) {
      setIsDropdownOpen(true);
    }
  }, [query]);

  /**
   * Handle search query with debounce
   */
  const debouncedSearch = useRef(
    debounce(async (searchQuery) => {
      setResults([]);

      if (!searchQuery || searchQuery.length < 3) {
        setIsDropdownOpen(false);
        return;
      }

      const currentRequestId = ++latestRequestId.current;
      setLoading(true);

      try {
        const url = `/search/minifig/${encodeURIComponent(searchQuery)}`;
        const data = await apiFetch(url);

        // If this isn't the latest request, don't process its results
        if (currentRequestId !== latestRequestId.current) return;

        if (data.error) {
          console.error("Error fetching minifigs:", data.error);
          setResults([]);
          setIsDropdownOpen(false);
          return;
        }

        // Double-check if this is still the latest request
        if (currentRequestId !== latestRequestId.current) return;

        console.log("Search results:", data);

        const searchResults = !data?.aborted ? data || [] : [];
        setResults(searchResults);
        setIsDropdownOpen(searchResults.length > 0);
        setSelectedIndex(-1); // Reset selected index on new results
      } catch (error) {
        // Only handle errors for the latest request
        if (currentRequestId !== latestRequestId.current) return;

        console.error("Error searching for minifigs:", error);
        setResults([]);
        setIsDropdownOpen(false);
      } finally {
        if (currentRequestId === latestRequestId.current) {
          setLoading(false);
        }
      }
    }, 300) // Reduced debounce time for better responsiveness
  ).current;

  /**
   * Handle input change
   *
   * @param {React.ChangeEvent} e - Input change event
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  /**
   * Handle minifig selection
   *
   * @param {Object} minifig - The selected minifig
   */
  const handleSelectMinifig = (minifig) => {
    setSearchNewMinifigResult(minifig);
    setIsDropdownOpen(false);
    setQuery("");
    setResults([]);
  };

  /**
   * Handle mouse entering a result item
   *
   * @param {number} index - The index of the hovered item
   */
  const handleMouseEnter = (index) => {
    setSelectedIndex(index);
  };

  /**
   * Clear search input
   */
  const clearSearch = () => {
    setQuery("");
    inputRef.current.focus();
  };

  return (
    <div className="relative w-full select-none">
      <label
        htmlFor="search-new-minifig"
        className="block text-sm font-medium mb-1.5 text-slate-300"
      >
        Search for a minifig
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id="search-new-minifig"
          type="text"
          value={query}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          onChange={handleInputChange}
          onFocus={() => query.length >= 3 && setIsDropdownOpen(true)}
          placeholder="Search minifigs (e.g. 'sw1234', 'fig-123456', 'Darth Vader')"
          className="w-full p-3 pl-10 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
          focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
          {loading ? (
            <LoaderIcon className="h-5 w-5" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>

        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ClearRounded className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden flex flex-col"
          style={{ maxHeight: "480px" }}
        >
          {/* Scrollable results area */}
          <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-600 flex-grow">
            {results.map((minifig, index) => (
              <div
                key={minifig.minifigIdRebrickable}
                className={`flex items-center p-3 cursor-pointer border-b border-slate-700 last:border-b-0 ${
                  index === selectedIndex
                    ? "bg-emerald-600/20 hover:bg-emerald-600/30"
                    : "hover:bg-slate-700/70"
                }`}
                onClick={() => handleSelectMinifig(minifig)}
                onMouseEnter={() => handleMouseEnter(index)}
              >
                <div className="h-12 w-12 bg-slate-700 rounded overflow-hidden flex-shrink-0 flex items-center justify-center mr-3">
                  {minifig.minifigImage ? (
                    <img
                      src={minifig.minifigImage}
                      alt={minifig.minifigName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">No img</span>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">
                    {minifig.minifigName}
                  </div>
                  <div className="text-xs text-slate-400">
                    ID: {minifig.minifigIdRebrickable}
                  </div>
                </div>
                <div className="flex-shrink-0 text-emerald-500">
                  <ArrowCircleDownRounded className="h-6 w-6" />
                </div>
              </div>
            ))}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center px-4 py-3 text-center text-slate-400">
                <LoaderIcon className="mr-2 h-4 w-4 text-emerald-500" />
                Searching minifigs...
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

      {/* Help text */}
      <p className="mt-2 text-xs text-slate-400">
        Start typing to search for minifigs by name or ID. Use arrow keys to
        navigate and Enter to select.
      </p>
    </div>
  );
}
