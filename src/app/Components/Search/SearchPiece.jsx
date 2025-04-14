// src/app/Components/Search/SearchPiece.jsx

// Functions and Helpers
import { useState, useRef } from "react";

// Icons
import { ClearRounded, SearchRounded } from "@mui/icons-material";

export default function SearchPiece({ searchTerm, setSearchTerm }) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Clear search handler
  const handleClearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1">
      <div
        className={`
        relative flex items-center transition-all duration-200 
      `}
      >
        {/* Search icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
          <SearchRounded fontSize="small" />
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pieces by name, ID, or color..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full h-12 pl-10 pr-10 text-slate-100 transition-all duration-100  bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Clear button */}
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ClearRounded className="z-10" fontSize="small" />
          </button>
        )}
      </div>

      {/* Search tips */}
      {isFocused && (
        <div className="absolute z-100 mt-2 w-full bg-slate-800 border border-slate-700 p-3 rounded-md shadow-lg text-sm text-slate-300">
          <p className="font-medium text-slate-200 mb-1.5">Search Tips:</p>
          <ul className="space-y-1 list-disc pl-5">
            <li>Search by piece name (e.g., "Brick 2x4")</li>
            <li>Search by ID (e.g., "3001")</li>
            <li>Search by color (e.g., "Red")</li>
            <li>Combine terms with spaces (e.g., "2x4 Red")</li>
          </ul>
        </div>
      )}
    </div>
  );
}
