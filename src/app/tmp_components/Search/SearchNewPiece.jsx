// src/app/components/Search/SearchNewPiece.jsx

import React, { useState, useEffect, useRef } from "react";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

export default function SearchNewPiece({ setSearchNewPieceResult }) {
  const [searchNewPieceTerm, setSearchNewPieceTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInput = inputRef.current?.contains(event.target);
      const clickedDropdown = dropdownRef.current?.contains(event.target);

      if (!clickedInput && !clickedDropdown) {
        setIsDropdownOpen(false);
      } else if (clickedInput && searchNewPieceTerm.length > 2) {
        setIsDropdownOpen(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchNewPieceTerm]);

  useEffect(() => {
    if (searchNewPieceTerm.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const debounceFetch = setTimeout(() => {
      const fetchData = async () => {
        // Store the current search term to compare later
        const currentSearchTerm = searchNewPieceTerm;

        try {
          const response = await fetch(
            `/api/search/part/${currentSearchTerm}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
              },
            }
          );
          const data = await response.json();

          // Only update if the search term hasn't changed since request was made
          if (currentSearchTerm === searchNewPieceTerm) {
            setResults(data.results || []);

            if (data.results && data.results.length > 0) {
              setIsDropdownOpen(true);
            } else {
              setIsDropdownOpen(false);
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          if (currentSearchTerm === searchNewPieceTerm) {
            setIsDropdownOpen(false);
          }
        }
      };
      fetchData();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [searchNewPieceTerm]);

  return (
    <div className="flex flex-col">
      <label className="block text-sm font-medium mb-1 text-gray-100">
        Search for a piece
      </label>
      <div className="relative mb-1">
        <SearchOutlinedIcon
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-100"
          size={18}
        />
        <input
          type="text"
          ref={inputRef}
          placeholder="Search pieces..."
          value={searchNewPieceTerm}
          onChange={(e) => {
            setSearchNewPieceTerm(e.target.value);
            setIsDropdownOpen(true);
          }}
          className="pl-10 w-full py-2 pr-4 border border-gray-300 text-gray-100 placeholder:text-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Dropdown List */}
        {results.length > 0 && (
          <ul
            ref={dropdownRef}
            className={`absolute z-10 bg-slate-800 border border-gray-300 w-full mt-1 rounded-lg shadow-lg max-h-60 overflow-auto transition-all duration-200 ease-out origin-top ${
              isDropdownOpen
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            {results.map((item) => {
              return (
                <li
                  key={item.part_num + item.theme_id}
                  className="flex flex-row gap-4 px-4 py-2 hover:bg-slate-900 cursor-pointer"
                  onClick={() => {
                    setSearchNewPieceTerm("");
                    setIsDropdownOpen(false);
                    setSearchNewPieceResult(item);
                  }}
                >
                  <img src={item.part_img_url} className="w-10 h-10"></img>
                  <div>
                    <div className="font-semibold text-gray-100">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-300">{item.part_num}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
