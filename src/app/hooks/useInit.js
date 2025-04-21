// src/app/hooks/useInit.js

"use client";
import { useEffect } from "react";
import { fetchAvailableTables } from "@/lib/Table/TableManager";
import { useLegoState } from "@/Context/LegoStateContext";

export default function useInit() {
  const {
    piecesByTable,
    setPiecesByTable,
    availableTables,
    setAvailableTables,
    selectedTable,
    setSelectedTable,
  } = useLegoState();

  useEffect(() => {
    const init = async () => {
      try {
        console.log("Fetching tables...");
        const tableData = await fetchAvailableTables();
        console.log("Tables fetched:", tableData);
        if (tableData?.length > 0) {
          setAvailableTables(tableData);

          const firstTable = tableData.find((t) => t.id == 1) || tableData[0];
          setSelectedTable(firstTable);
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };

    init();
  }, []);

  return {
    piecesByTable,
    setPiecesByTable,
    availableTables,
    setAvailableTables,
    selectedTable,
    setSelectedTable,
  };
}
