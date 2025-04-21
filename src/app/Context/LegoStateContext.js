// src/app/Context/LegoStateContext.js

"use client";
import { createContext, useContext, useState } from "react";
import { useStatus } from "./StatusContext.tsx";

const LegoStateContext = createContext();

export function LegoStateProvider({ children }) {
  const [piecesByTable, setPiecesByTable] = useState({});
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState("all"); // "all", "add", "import", "export"

  const { showSuccess, showWarning } = useStatus();

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
    <LegoStateContext.Provider
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
    </LegoStateContext.Provider>
  );
}

export function useLegoState() {
  return useContext(LegoStateContext);
}
