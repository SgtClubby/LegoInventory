// src/app/Components/AddNewElement/AddNewForm.jsx

import { useLego } from "@/Context/LegoContext";
import AddNewPiece from "./AddNewPiece";
import AddNewMinifig from "./AddNewMinifig";

export default function AddNewPieceForm() {
  const { selectedTable } = useLego();
  const isMinifig = selectedTable?.isMinifig || false;

  // Render the correct form based on table type
  return isMinifig ? <AddNewMinifig /> : <AddNewPiece />;
}
