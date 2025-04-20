// src/app/Context/LegoContext.js

"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useStatus } from "./StatusContext";

const LegoContext = createContext();

export function LegoProvider({ children }) {
  const [piecesByTable, setPiecesByTable] = useState({});
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState("all"); // "all", "add", "import", "export"
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setAddShowModal] = useState({
    show: false,
    isMinifig: false,
  });
  const [showDeleteTableModal, setShowDeleteTableModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pieceToDelete, setPieceToDelete] = useState(null);

  const { showSuccess, showError, showWarning } = useStatus();

  const setSelectedTableWithStatus = (table) => {
    setSelectedTable(table);
    {
      table.name
        ? showSuccess(`Selected table: ${table.name}`, {
            position: "top",
            autoCloseDelay: 3000,
          })
        : showWarning("You have no tables...", {
            position: "top",
            autoCloseDelay: 3000,
          });
    }
  };

  return (
    <LegoContext.Provider
      value={{
        piecesByTable,
        setPiecesByTable,
        availableTables,
        setAvailableTables,
        selectedTable,
        statusMessage,
        setStatusMessage,
        setSelectedTable: setSelectedTableWithStatus,
        setActiveTab,
        activeTab,
        setShowImportModal,
        showImportModal,
        setAddShowModal,
        showAddModal,
        setShowDeleteTableModal,
        showDeleteTableModal,
        deleteModalOpen,
        setDeleteModalOpen,
        pieceToDelete,
        setPieceToDelete,
      }}
    >
      {children}
    </LegoContext.Provider>
  );
}

export function useLego() {
  return useContext(LegoContext);
}
