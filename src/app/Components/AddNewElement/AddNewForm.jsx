// src/app/Components/AddNewElement/AddNewForm.jsx

import { useLegoState } from "@/Context/LegoStateContext";
import AddNewPiece from "./AddNewPiece";
import AddNewMinifig from "./AddNewMinifig";

export default function AddNewPieceForm() {
  const { selectedTable } = useLegoState();
  const isMinifig = selectedTable?.isMinifig || false;

  // Render the correct form based on table type
  return isMinifig ? <AddNewMinifig /> : <AddNewPiece />;
}
