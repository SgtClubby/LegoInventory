// src/app/components/Main/AddNewPieceForm.jsx

// Icons
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

// Components
import SearchNewPiece from "@/components/Search/SearchNewPiece";

// Functions and Helpers
import colors from "@/colors/colors.js";
import getColorStyle from "@/lib/Misc/getColorStyle";
import { useLego } from "@/Context/LegoContext";
import { addPieceToTable } from "@/lib/Pieces/PiecesManager";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export default function AddNewPieceForm() {
  // ---------------------------
  // Context
  // ---------------------------

  const { setPiecesByTable, selectedTable } = useLego();

  // ---------------------------
  // Component state
  // ---------------------------
  const [searchNewPieceResult, setSearchNewPieceResult] = useState(null);
  const [newPiece, setNewPiece] = useState({
    uuid: uuidv4(),
    elementName: "",
    elementId: "",
    elementColor: "",
    elementColorId: "",
    elementImage: "",
    elementQuantityOnHand: 0,
    elementQuantityRequired: 0,
    countComplete: false,
  });

  // ---------------------------
  // Update newPiece when search result arrives
  // ---------------------------
  useEffect(() => {
    if (searchNewPieceResult) {
      const { part_num, name, part_img_url } = searchNewPieceResult;
      const elementColorId = colors.find(
        (c) => c.colorName === newPiece.elementColor
      )?.colorId;
      setNewPiece({
        ...newPiece,
        uuid: uuidv4(),
        elementColorId,
        elementImage: part_img_url,
        elementId: part_num,
        elementName: name,
        countComplete: false,
      });
    }
  }, [searchNewPieceResult]);

  // ---------------------------
  // Set state when search result arrives
  // ---------------------------

  useEffect(() => {
    if (searchNewPieceResult) {
      const { part_num, name, part_img_url } = searchNewPieceResult;
      const elementColorId = colors.find(
        (c) => c.colorName === newPiece.elementColor
      )?.colorId;
      setNewPiece({
        ...newPiece,
        uuid: uuidv4(),
        elementColorId,
        elementImage: part_img_url,
        elementId: part_num,
        elementName: name,
        countComplete: false,
      });
    }
  }, [searchNewPieceResult]);

  // ---------------------------
  // Handle add piece
  // ---------------------------
  const handleAddPiece = async () => {
    if (
      !newPiece.elementName ||
      !newPiece.elementId ||
      !newPiece.elementColor
    ) {
      alert("Please fill out the required fields (Name, ID, and Color)");
      return;
    }

    const elementColorId = colors.find(
      (c) => c.colorName === newPiece.elementColor
    )?.colorId;
    const updatedNewPiece = {
      ...newPiece,
      uuid: uuidv4(),
      elementColorId,
      countComplete:
        newPiece.elementQuantityRequired === 0
          ? null
          : newPiece.elementQuantityOnHand >= newPiece.elementQuantityRequired,
    };

    const tableId = selectedTable.id;

    // Update local state
    setPiecesByTable((prev) => {
      const tablePieces = prev[tableId] || [];
      return { ...prev, [tableId]: [...tablePieces, updatedNewPiece] };
    });

    // Save new piece via API call
    const success = await addPieceToTable(updatedNewPiece, tableId);
    if (!success) {
      alert("Failed to add piece.");
      return;
    }

    // Reset form state
    setNewPiece({
      uuid: uuidv4(),
      elementName: "",
      elementId: "",
      elementColor: "",
      elementColorId: "",
      elementQuantityOnHand: 0,
      elementQuantityRequired: 0,
      countComplete: false,
    });
  };

  return (
    <>
      <SearchNewPiece
        searchNewPieceResult={searchNewPieceResult}
        setSearchNewPieceResult={setSearchNewPieceResult}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Piece fields */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-100">
            Name <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type="text"
            value={newPiece.elementName}
            onChange={(e) =>
              setNewPiece({
                ...newPiece,
                elementName: e.target.value,
              })
            }
            className="w-full p-2 border border-gray-300 rounded text-gray-100 placeholder:text-gray-300"
            placeholder="Brick 2x4"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-100">
            ID <span className="text-red-400 ml-1">*</span>
          </label>
          <input
            type="text"
            value={newPiece.elementId}
            onChange={(e) =>
              setNewPiece({
                ...newPiece,
                elementId: e.target.value,
              })
            }
            className="w-full p-2 border border-gray-300 rounded text-gray-100 placeholder:text-gray-300"
            placeholder="e.g. 3001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-100">
            Color <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="relative">
            <div
              style={getColorStyle(newPiece.elementColor)}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            ></div>
            <select
              value={newPiece.elementColor}
              onChange={(e) =>
                setNewPiece({
                  ...newPiece,
                  elementColor: e.target.value,
                })
              }
              className="w-full pl-10 py-2 pr-4 border border-gray-300 rounded text-gray-100"
            >
              <option value="" className="bg-slate-800">
                Select color
              </option>
              {colors.map((color) => (
                <option
                  key={color.colorName}
                  className="bg-slate-800"
                  value={color.colorName}
                >
                  {color.colorName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-100">
            On Hand
          </label>
          <input
            type="number"
            min="0"
            value={newPiece.elementQuantityOnHand}
            onChange={(e) =>
              setNewPiece({
                ...newPiece,
                elementQuantityOnHand: parseInt(e.target.value) || 0,
              })
            }
            className="text-gray-300 w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-100">
            Required
          </label>
          <input
            type="number"
            min="0"
            value={newPiece.elementQuantityRequired}
            onChange={(e) =>
              setNewPiece({
                ...newPiece,
                elementQuantityRequired: parseInt(e.target.value) || 0,
              })
            }
            className="w-full p-2 border border-gray-300 rounded text-gray-300"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleAddPiece}
            className="flex items-center blue-btn"
          >
            <AddCircleOutlineIcon size={18} className="mr-2" />
            Add Piece
          </button>
        </div>
      </div>
    </>
  );
}
