// src/app/components/Search/SearchSet.jsx

import React, { useState, useEffect, useRef } from "react";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

export default function SearchSet({ setSetSearchResult }) {
  const [searchSetTerm, setSearchSetTerm] = useState("");
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
      } else if (clickedInput && searchSetTerm.length > 2) {
        setIsDropdownOpen(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchSetTerm]);

  useEffect(() => {
    if (searchSetTerm.length < 2) {
      setResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const debounceFetch = setTimeout(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(`/api/search/set/${searchSetTerm}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
            },
          });
          const data = await response.json();

          setResults(data.results || []);

          // 🔥 Show dropdown only if results exist
          if (data.results && data.results.length > 0) {
            setIsDropdownOpen(true);
          } else {
            setIsDropdownOpen(false);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          setIsDropdownOpen(false); // Hide dropdown on failure
        }
      };
      fetchData();
    }, 300);

    return () => clearTimeout(debounceFetch);
  }, [searchSetTerm]);

  return (
    <div className="md:max-w-[300px] max-w-[220px]">
      <label className="block text-sm text-gray-100 font-medium mb-1">
        Import set?
      </label>
      <div className="relative mb-1 w-full">
        <SearchOutlinedIcon
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-100"
          size={18}
        />
        <input
          type="text"
          ref={inputRef}
          placeholder="Search set..."
          value={searchSetTerm}
          onChange={(e) => {
            setSearchSetTerm(e.target.value);
          }}
          className="pl-10 w-full py-2 pr-4 border text-gray-100 placeholder:text-gray-400 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {results.map((set) => (
              <li
                key={set.set_num}
                className="flex flex-row gap-4 px-4 py-2 hover:bg-slate-900 cursor-pointer"
                onClick={() => {
                  // Example: update the search term with the selected piece name
                  setSearchSetTerm("");
                  setIsDropdownOpen(false);
                  setSetSearchResult(set);
                }}
              >
                <img src={set.set_img_url} className="w-10 h-10"></img>
                <div>
                  <div className="font-semibold text-gray-100">{set.name}</div>
                  <div className="text-xs text-gray-300">{set.set_num}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
