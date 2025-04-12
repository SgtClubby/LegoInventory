// src/app/hooks/useInit.js

"use client";
import { useEffect } from "react";
import { fetchPiecesFromTable } from "@/lib/Pieces/PiecesManager";
import { fetchTables } from "@/lib/Table/TableManager";
import { useLego } from "@/Context/LegoContext";

export default function useInit() {
  const {
    piecesByTable,
    setPiecesByTable,
    pieceImages,
    setPieceImages,
    availableTables,
    setAvailableTables,
    selectedTable,
    setSelectedTable,
  } = useLego();

  useEffect(() => {
    const init = async () => {
      try {
        console.log("Fetching tables...");
        const fetchedTables = await fetchTables();
        if (fetchedTables?.length > 0) {
          setAvailableTables(fetchedTables);

          const firstTable =
            fetchedTables.find((t) => t.id == 1) || fetchedTables[0];
          setSelectedTable(firstTable);

          console.log(`Fetching pieces for table ${firstTable.id}...`);
          const savedData = await fetchPiecesFromTable(firstTable.id);
          if (savedData) {
            console.log(savedData);
            setPiecesByTable((prev) => ({
              ...prev,
              [firstTable.id]: savedData,
            }));
          }
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };

    init();
  }, []);

  return {
    pieceImages,
    setPieceImages,
    piecesByTable,
    setPiecesByTable,
    availableTables,
    setAvailableTables,
    selectedTable,
    setSelectedTable,
  };
}
