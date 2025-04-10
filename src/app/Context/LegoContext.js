// src/app/Context/LegoContext.js

"use client";
import { createContext, useContext, useState } from "react";

const LegoContext = createContext();

export function LegoProvider({ children }) {
  const [piecesByTable, setPiecesByTable] = useState({});
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  return (
    <LegoContext.Provider
      value={{
        piecesByTable,
        setPiecesByTable,
        availableTables,
        setAvailableTables,
        selectedTable,
        setSelectedTable,
      }}
    >
      {children}
    </LegoContext.Provider>
  );
}

export function useLego() {
  return useContext(LegoContext);
}
