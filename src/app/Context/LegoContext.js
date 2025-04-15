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

  const { showSuccess, showError, showWarning } = useStatus();

  const setSelectedTableWithStatus = (table) => {
    setSelectedTable(table);
    showSuccess(`Switched to ${table.name}`);
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
      }}
    >
      {children}
    </LegoContext.Provider>
  );
}

export function useLego() {
  return useContext(LegoContext);
}
