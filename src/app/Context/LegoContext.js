// src/app/Context/LegoContext.js

"use client";
import { createContext, useContext, useEffect, useState } from "react";

const LegoContext = createContext();

export function LegoProvider({ children }) {
  const [piecesByTable, setPiecesByTable] = useState({});
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });
  const [activeTab, setActiveTab] = useState("all"); // "all", "add", "import", "export"

  useEffect(() => {
    // clear status message after 3 seconds
    console.log(statusMessage.message);
    const timer = setTimeout(() => {
      setStatusMessage({ type: "", message: "" });
    }, 5000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

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
        setSelectedTable: (table) => {
          setSelectedTable(table);
          setStatusMessage({
            type: "success",
            message: `Switched to ${table.name}`,
          });
        },
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
