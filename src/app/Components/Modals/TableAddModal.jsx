// src/app/Components/Modals/TableAddModal.jsx

import { Add, DehazeRounded } from "@mui/icons-material";
import { useEffect, useState } from "react";

export default function TableAddModal({
  setNewTableName,
  newTableName,
  toggleModal,
  handleSubmit,
}) {
  const [isValid, setIsValid] = useState(false);

  // Validate input
  useEffect(() => {
    setIsValid(newTableName.trim().length > 0);
  }, [newTableName]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, []);

  // Handle submit with enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isValid) {
      handleSubmit(newTableName);
    }
  };

  const handleClose = () => {
    toggleModal(false);
    setNewTableName("");
  };

  return (
    <div className="z-[10000] fixed inset-0 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div
        className="absolute inset-0 z-0 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
        onClick={handleClose}
      ></div>

      {/* Modal content */}
      <div className="z-[10001] bg-slate-800 rounded-xl border border-slate-700 shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-in-out animate-modalAppear">
        <div className="p-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <DehazeRounded className="text-blue-500" fontSize="large" />
          </div>

          <h2 className="text-2xl font-semibold text-white text-center mb-5">
            Add New Table
          </h2>

          <div className="mb-6">
            <label
              htmlFor="table-name"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Table Name
            </label>
            <input
              id="table-name"
              type="text"
              placeholder="Enter a name for your new table"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full py-3 px-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20 transition-colors duration-200"
            />
            <p className="mt-2 text-sm text-slate-400">
              Give your table a descriptive name like "Star Wars Collection" or
              "Summer 2023 Sets"
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
            <button
              onClick={handleClose}
              className="inline-flex justify-center items-center px-4 py-2.5 border border-slate-600 text-slate-200 font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors duration-200"
            >
              Cancel
            </button>

            <button
              onClick={() => handleSubmit(newTableName)}
              disabled={!isValid}
              className={`inline-flex justify-center items-center px-4 py-2.5 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                isValid
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-600 text-slate-300 cursor-not-allowed"
              }`}
            >
              <Add className="h-5 w-5 mr-2" fontSize="medium" />
              Add Table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
