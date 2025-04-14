// src/app/Components/Main/AddNewPieceForm.jsx

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

// Icons
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Components
import SearchNewPiece from "@/Components/Search/SearchNewPiece";

// Functions and Helpers
import colors from "@/Colors/colors.js";
import { useLego } from "@/Context/LegoContext";
import { addPieceToTable } from "@/lib/Pieces/PiecesManager";
import getColorStyle from "@/lib/Misc/getColorStyle";
import { Add, BrokenImage, InsertPhotoRounded } from "@mui/icons-material";

export default function AddNewPieceForm() {
  // Context
  const { setPiecesByTable, selectedTable } = useLego();

  // Component state
  const [searchNewPieceResult, setSearchNewPieceResult] = useState(null);
  const [newPiece, setNewPiece] = useState({
    uuid: uuidv4(),
    elementName: "",
    elementId: "",
    elementColor: "",
    elementColorId: "",
    availableColors: [],
    elementQuantityOnHand: 0,
    elementQuantityRequired: 0,
    countComplete: false,
  });
  const [image, setImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [fade, setFade] = useState(false);

  // Validate form
  useEffect(() => {
    const isValid = Boolean(
      newPiece.elementName && newPiece.elementId && newPiece.elementColor
    );
    setFormValid(isValid);
  }, [newPiece.elementName, newPiece.elementId, newPiece.elementColor]);

  // Update newPiece when search result arrives
  useEffect(() => {
    if (searchNewPieceResult) {
      const { part_num, name, part_img_url } = searchNewPieceResult;

      // First update the basic information
      setNewPiece((prev) => ({
        ...prev,
        uuid: uuidv4(),
        elementId: part_num,
        elementName: name,
        countComplete: false,
      }));

      setImage(part_img_url);

      // Then fetch colors separately
      const fetchColors = async () => {
        try {
          const response = await fetch(`/api/part/${part_num}/colors`);
          const colorData = await response.json();

          // Update with colors without overriding other properties
          setNewPiece((current) => ({
            ...current,
            availableColors: colorData,
          }));

          // If there are colors available, set the first one as default
          if (colorData?.length > 0) {
            setNewPiece((current) => ({
              ...current,
              elementColor: colorData[0].color,
              elementColorId: colorData[0].colorId,
            }));
          }
        } catch (error) {
          console.error("Error fetching colors:", error);
        } finally {
          setImageLoading(false);
        }
      };

      fetchColors();
    }
  }, [searchNewPieceResult]);

  // Update image when color changes
  useEffect(() => {
    if (
      newPiece.elementColorId &&
      newPiece.elementId &&
      newPiece.availableColors.length === 0
    ) {
      console.log("Fetching image from API");
      setFade(false); // Reset fade flag
      const fetchImage = async () => {
        try {
          const response = await fetch(
            `/api/image/${newPiece.elementId}/${newPiece.elementColorId}`
          );
          const data = await response.json();

          if (data.part_img_url) {
            setImage(data.part_img_url);
            setFade(false); // Ensure it's reset
          }
        } catch (error) {
          console.error("Error fetching image:", error);
        }
      };
      fetchImage();
    } else {
      console.log("Using available colors");
      setFade(false); // Reset fade flag
      const colorData = newPiece.availableColors.find(
        (color) => color.colorId == newPiece.elementColorId
      );
      if (colorData) {
        setImage(colorData.elementImage);
        setFade(false); // Ensure it's reset
      }
    }
  }, [newPiece.elementColorId, newPiece.elementId, newPiece.availableColors]);

  // Handle input change
  const handleInputChange = (field, value) => {
    setNewPiece((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle color selection
  const handleColorSelect = (colorName) => {
    const colorObj = colors.find((c) => c.colorName === colorName);
    if (colorObj) {
      setNewPiece((prev) => ({
        ...prev,
        elementColor: colorName,
        elementColorId: colorObj.colorId,
      }));
    }
    setShowColorDropdown(false);
  };

  // Handle add piece
  const handleAddPiece = async () => {
    if (!formValid) {
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
      return;
    }

    // Reset form state
    setSearchNewPieceResult(null);
    setImage(null);
    setImageLoading(false);
    setNewPiece({
      uuid: uuidv4(),
      elementName: "",
      elementId: "",
      elementColor: "",
      elementColorId: "",
      availableColors: [],
      elementQuantityOnHand: 0,
      elementQuantityRequired: 0,
      countComplete: false,
    });
  };

  // Color selection dropdown
  const ColorDropdown = () => {
    // Filter colors to show available ones first, if we have availability data
    const availableColorIds = newPiece.availableColors.map((c) => c.colorId);
    const sortedColors = [...colors].sort((a, b) => {
      const aAvailable = availableColorIds.includes(a.colorId.toString());
      const bAvailable = availableColorIds.includes(b.colorId.toString());

      // Sort available colors first
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;

      // Then alphabetically
      return a.colorName.localeCompare(b.colorName);
    });

    return (
      <div className="absolute z-40 top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-slate-800 border border-slate-600 rounded-md shadow-xl scrollbar-thin scrollbar-thumb-slate-600">
        {newPiece.availableColors.length > 0 && (
          <div className="p-2 text-xs text-slate-400 font-medium">
            Available Colors:
          </div>
        )}

        <div className="py-1 px-1">
          {sortedColors.map((color) => {
            const isAvailable = availableColorIds.includes(
              color.colorId.toString()
            );

            return (
              <div
                key={color.colorName}
                className={`flex items-center px-3 py-2 rounded hover:bg-slate-700 cursor-pointer ${
                  color.colorName === newPiece.elementColor
                    ? "bg-slate-700"
                    : ""
                } ${isAvailable ? "" : "opacity-60"}`}
                onClick={() => handleColorSelect(color.colorName)}
              >
                <div
                  style={getColorStyle(color.colorName)}
                  className="w-5 h-5 rounded-full mr-2"
                />
                <span className="text-slate-200 text-sm">
                  {color.colorName}
                </span>

                {isAvailable && (
                  <CheckIcon className="h-4 w-4 ml-auto text-blue-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
      <h2 className="text-2xl font-semibold text-white mb-6">Add New Piece</h2>

      {/* Search (Left) and Image (Right) */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Left: Search */}
        <div className="w-full sm:w-2/3">
          <SearchNewPiece
            searchNewPieceResult={searchNewPieceResult}
            setSearchNewPieceResult={setSearchNewPieceResult}
          />
        </div>

        {/* Right: Image Preview */}
        <div className="w-full sm:w-1/3 flex justify-center sm:justify-end">
          <div className="w-40 h-40 bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
            {imageLoading ? (
              <div className="animate-pulse w-full h-full bg-slate-600" />
            ) : image ? (
              <img
                key={image}
                src={`${image}?t=${new Date().getTime()}`} // optional cache-buster
                alt={newPiece.elementName}
                onLoad={() => {
                  setFade(true);
                  setImageLoading(false);
                }}
                className={`w-full h-full object-contain transition-opacity duration-300 ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : (
              <InsertPhotoRounded className="h-6 w-6 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Form Fields in a Two-Column Layout (Name/ID/Color on left, Quantities on right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Column 1: Piece Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newPiece.elementName}
              onChange={(e) => handleInputChange("elementName", e.target.value)}
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
            focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Brick 2x4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newPiece.elementId}
              onChange={(e) => handleInputChange("elementId", e.target.value)}
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
            focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 3001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Color <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div
                className="flex items-center w-full p-3 border border-slate-600 rounded-lg 
              bg-slate-700 text-slate-200 cursor-pointer"
                onClick={() => setShowColorDropdown(!showColorDropdown)}
              >
                {newPiece.elementColor ? (
                  <>
                    <div
                      style={getColorStyle(newPiece.elementColor)}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span>{newPiece.elementColor}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Select a color</span>
                )}
                <ExpandMoreIcon className="h-5 w-5 ml-auto text-slate-400" />
              </div>
              {showColorDropdown && <ColorDropdown />}
            </div>
          </div>
        </div>

        {/* Column 2: Quantities */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Quantity On Hand
            </label>
            <input
              type="number"
              min="0"
              value={newPiece.elementQuantityOnHand}
              onChange={(e) =>
                handleInputChange(
                  "elementQuantityOnHand",
                  parseInt(e.target.value) || 0
                )
              }
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
            focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Quantity Required
            </label>
            <input
              type="number"
              min="0"
              value={newPiece.elementQuantityRequired}
              onChange={(e) =>
                handleInputChange(
                  "elementQuantityRequired",
                  parseInt(e.target.value) || 0
                )
              }
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
            focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Completion Status
            </label>
            <div className="p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200">
              <div
                className={`px-3 py-0.5 text-sm rounded-full inline-flex items-center w-fit ${
                  newPiece.elementQuantityRequired === 0
                    ? "bg-slate-600 text-slate-200"
                    : newPiece.elementQuantityOnHand >=
                      newPiece.elementQuantityRequired
                    ? "bg-emerald-200 text-emerald-900"
                    : "bg-rose-200 text-rose-900"
                }`}
              >
                {newPiece.elementQuantityRequired === 0
                  ? "General"
                  : newPiece.elementQuantityOnHand >=
                    newPiece.elementQuantityRequired
                  ? "Complete"
                  : "Incomplete"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Piece Button */}
      <div className="flex justify-end">
        <button
          onClick={handleAddPiece}
          disabled={!formValid}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-all
          ${
            formValid
              ? "bg-blue-600 hover:bg-blue-700 transition-opacity duration-200 ease-in-out"
              : "bg-slate-600 opacity-50 cursor-not-allowed pointer-events-none"
          }
        `}
        >
          <div className="flex items-center justify-center">
            <Add className="h-5 w-5 mr-2" />
            Add Piece
          </div>
        </button>
      </div>
    </div>
  );
}
