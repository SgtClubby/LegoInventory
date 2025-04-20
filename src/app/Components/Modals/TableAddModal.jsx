// src/app/Components/Modals/TableAddModal.jsx

import { Add, DehazeRounded } from "@mui/icons-material";
import { addTable } from "@/lib/Table/TableManager";
import { useEffect, useState } from "react";
import { useLego } from "@/Context/LegoContext";
import { useStatus } from "@/Context/StatusContext";
import ToggleSwitch from "@/Components/Misc/ToggleSwitch";

export default function TableAddModal({ toggleModal }) {
  const [isValid, setIsValid] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableDescription, setnNewTableDescription] = useState("");
  const { availableTables, setAvailableTables, showAddModal, setAddShowModal } =
    useLego();
  const [isMinifig, setIsMinifig] = useState(showAddModal.isMinifig);
  const { showSuccess } = useStatus();

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

  const handleSubmit = async () => {
    const newTable = await addTable(
      newTableName || `Table ${availableTables.length + 1}`,
      newTableDescription || "",
      isMinifig
    );

    if (!newTable) {
      showError("Error creating table. Please try again.", {
        position: "top",
        autoCloseDelay: 3000,
      });
      setNewTableName("");
      setnNewTableDescription("");
      setIsMinifig(false);
      setIsValid(false);
      handleClose();
      return;
    }

    setAvailableTables([...availableTables, newTable]);
    showSuccess(`Table "${newTableName}" has been added successfully!`, {
      position: "top",
      autoCloseDelay: 3000,
    });
    setAddShowModal(false);
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
            Add New {isMinifig ? "Minifig" : "Piece/Set"} Table
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
              Give your table a short descriptive name like Add New{" "}
              {isMinifig ? "Minifig" : "Piece/Set"} Table .
            </p>
          </div>
          <div className="mb-6">
            <label
              htmlFor="table-name"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Table Description
            </label>
            <input
              id="table-name"
              type="text"
              placeholder="Enter a description"
              value={newTableDescription}
              onChange={(e) => setnNewTableDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full py-3 px-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20 transition-colors duration-200"
            />
            <p className="mt-2 text-sm text-slate-400">
              Give your table a description?
            </p>
          </div>
          <div className="mb-6">
            <ToggleSwitch
              label="Is this a minifig table?"
              checked={isMinifig}
              onChange={() => setIsMinifig(!isMinifig)}
              size="md"
              color="blue"
              disabled={false}
            />
            <p className="mt-2 text-sm text-slate-400">
              This will show pricing information in this table.<br></br> Only
              available for minifigs.
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
