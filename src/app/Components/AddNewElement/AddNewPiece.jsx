// src/app/Components/AddNewElement/AddNewPiece.jsx

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Add, InsertPhotoRounded } from "@mui/icons-material";
import SearchNewPiece from "@/Components/Search/SearchNewPiece";
import colors from "@/Colors/colors.js";
import { useLegoState } from "@/Context/LegoStateContext";
import { addPieceToTable } from "@/lib/Pieces/PiecesManager";
import getColorStyle from "@/lib/Color/getColorStyle";
import { useStatus } from "@/Context/StatusContext.tsx";
import TableSelectDropdown from "@/Components/Misc/TableSelectDropdown";
import { apiFetch } from "@/lib/API/client/apiFetch";

export default function AddNewPiece() {
  const { setPiecesByTable, selectedTable, setActiveTab } = useLegoState();
  const { showSuccess, showError, showWarning } = useStatus();

  const [searchNewPieceResult, setSearchNewPieceResult] = useState(null);
  const [newItem, setNewItem] = useState(() => initializeNewItem());
  const [image, setImage] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [fade, setFade] = useState(false);

  function initializeNewItem() {
    return {
      uuid: uuidv4(),
      elementName: "",
      elementId: "",
      elementColor: "",
      elementColorId: "",
      availableColors: [],
      elementQuantityOnHand: 0,
      elementQuantityRequired: 0,
      countComplete: false,
      highlighted: false,
      invalid: false,
    };
  }

  useEffect(() => {
    setNewItem(initializeNewItem());
    setImage(null);
    setImageLoading(false);
    setSearchNewPieceResult(null);
    setShowColorDropdown(false);
    setFormValid(false);
  }, [selectedTable?.id]);

  useEffect(() => {
    const isValid = Boolean(
      newItem.elementName && newItem.elementId && newItem.elementColor
    );
    setFormValid(isValid);
  }, [newItem]);

  useEffect(() => {
    if (searchNewPieceResult) {
      setNewItem(initializeNewItem());
      const { elementId, elementName, elementImage } = searchNewPieceResult;
      setNewItem((prev) => ({
        ...prev,
        uuid: uuidv4(),
        elementId,
        elementName,
        countComplete: false,
      }));
      setImage(elementImage);

      const fetchColors = async () => {
        try {
          const colorData = await apiFetch(`/part/${elementId}/colors`);
          if (colorData.error) {
            showError("No colors found for this piece.", {
              autoCloseDelay: 5000,
            });
            return;
          }
          setNewItem((current) => ({
            ...current,
            availableColors: colorData,
          }));
          if (colorData?.length > 0) {
            setNewItem((current) => ({
              ...current,
              elementColor: colorData[0].color,
              elementColorId: colorData[0].colorId,
            }));
          }
        } catch (error) {
          showError("Error fetching piece. Please try again later.", {
            autoCloseDelay: 5000,
          });
        } finally {
          setImageLoading(false);
        }
      };
      fetchColors();
    }
  }, [searchNewPieceResult, showError]);

  useEffect(() => {
    if (
      newItem.elementColorId &&
      newItem.elementId &&
      newItem.availableColors.length === 0
    ) {
      const fetchImage = async () => {
        try {
          const imageData = await apiFetch(
            `/image/${newItem.elementId}/${newItem.elementColorId}`
          );

          if (imageData && imageData.elementImage) {
            setImage(imageData.elementImage);
            setFade(false);
          }
        } catch (error) {
          showError("Error fetching piece image.", {
            autoCloseDelay: 5000,
          });
        }
      };
      fetchImage();
    } else {
      const colorData = newItem?.availableColors?.find(
        (color) => color.colorId == newItem.elementColorId
      );
      if (colorData && colorData.elementImage) {
        setImage(colorData.elementImage);
        setFade(false);
      }
    }
  }, [
    newItem.elementColorId,
    newItem.elementId,
    newItem.availableColors,
    showError,
  ]);

  const handleInputChange = (field, value) => {
    setNewItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleColorSelect = (colorName) => {
    const colorObj = colors.find((c) => c.colorName === colorName);
    if (colorObj) {
      setNewItem((prev) => ({
        ...prev,
        elementColor: colorName,
        elementColorId: colorObj.colorId,
      }));
    }
    setShowColorDropdown(false);
  };

  const handleAddItem = async () => {
    if (!formValid) {
      showWarning("Please fill in all required fields.", {
        autoCloseDelay: 3000,
      });
      return;
    }
    const tableId = selectedTable.id;
    await addPiece(tableId);
    setActiveTab("all");
    setSearchNewPieceResult(null);
    setImage(null);
    setImageLoading(false);
    setNewItem(initializeNewItem());
  };

  const addPiece = async (tableId) => {
    const elementColorId = colors.find(
      (c) => c.colorName === newItem.elementColor
    )?.colorId;
    const updatedNewPiece = {
      ...newItem,
      uuid: uuidv4(),
      elementColorId,
      countComplete:
        newItem.elementQuantityRequired === 0
          ? null
          : newItem.elementQuantityOnHand >= newItem.elementQuantityRequired,
    };
    setPiecesByTable((prev) => {
      const tablePieces = prev[tableId] || [];
      return { ...prev, [tableId]: [...tablePieces, updatedNewPiece] };
    });
    const success = await addPieceToTable(updatedNewPiece, tableId);
    if (!success) {
      showError("Error adding piece. Please try again later.", {
        autoCloseDelay: 5000,
      });
      return;
    }
    showSuccess("Piece added successfully!", {
      position: "top",
      autoCloseDelay: 3000,
    });
  };

  const ColorDropdown = () => {
    const availableColorIds = newItem.availableColors.map((color) =>
      color.colorId.toString()
    );
    const sortedColors = [...colors].sort((a, b) => {
      const aAvailable = availableColorIds.includes(a.colorId.toString());
      const bAvailable = availableColorIds.includes(b.colorId.toString());
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;
      return a.colorName.localeCompare(b.colorName);
    });

    return (
      <div className="absolute z-40 top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-slate-800 border border-slate-600 rounded-md shadow-xl scrollbar-thin scrollbar-thumb-slate-600">
        {newItem.availableColors.length > 0 && (
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
                  color.colorName === newItem.elementColor ? "bg-slate-700" : ""
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
                  <CheckIcon className="h-4 w-4 ml-auto text-emerald-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getCompletionStatus = () => {
    const required = newItem.elementQuantityRequired;
    const onHand = newItem.elementQuantityOnHand;
    if (required === 0) {
      return {
        text: "General",
        className: "bg-slate-600 text-slate-200",
      };
    } else if (onHand >= required) {
      return {
        text: "Complete",
        className: "bg-emerald-200 text-emerald-900",
      };
    } else {
      return {
        text: "Incomplete",
        className: "bg-rose-200 text-rose-900",
      };
    }
  };

  const completionStatus = getCompletionStatus();

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
      <h2 className="text-2xl font-semibold text-white mb-6">Add New Piece</h2>
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        <div className="flex flex-col w-full">
          <div className="w-full ">
            <SearchNewPiece
              searchNewPieceResult={searchNewPieceResult}
              setSearchNewPieceResult={setSearchNewPieceResult}
            />
          </div>
          <div className="w-full mt-4 relative">
            <TableSelectDropdown />
            <p className="mt-2 text-xs text-slate-400">
              Select the table where you want to add this piece. If you don't
              see your table, you can create one in the "Browse All Pieces" tab.
            </p>
          </div>
        </div>
        <div className="w-full sm:w-1/3 mt-6 md:-mt-2 flex justify-center sm:justify-end">
          <div className="md:min-w-60 md:min-h-60 w-50 h-50 bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
            {imageLoading ? (
              <div className="animate-pulse w-full h-full bg-slate-600" />
            ) : image ? (
              <img
                key={image}
                src={`${image}?t=${new Date().getTime()}`}
                alt={newItem.elementName}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newItem?.elementName || ""}
              onChange={(e) => handleInputChange("elementName", e.target.value)}
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Brick 2x4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newItem?.elementId || ""}
              onChange={(e) => handleInputChange("elementId", e.target.value)}
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. 3001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Quantity On Hand
            </label>
            <input
              type="number"
              min="0"
              value={newItem?.elementQuantityOnHand || 0}
              onChange={(e) => {
                handleInputChange(
                  "elementQuantityOnHand",
                  parseInt(e.target.value) || 0
                );
              }}
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
              focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="flex flex-col space-y-4 justify-between">
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
                {newItem.elementColor ? (
                  <>
                    <div
                      style={getColorStyle(newItem.elementColor)}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span>{newItem.elementColor}</span>
                  </>
                ) : (
                  <span className="text-slate-400">Select a color</span>
                )}
                <div
                  className={`pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform duration-100 ${
                    showColorDropdown ? "rotate-180" : ""
                  }`}
                >
                  <ExpandMoreIcon className="h-5 w-5 ml-auto text-slate-400" />
                </div>
              </div>
              {showColorDropdown && <ColorDropdown />}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Quantity Required
            </label>
            <input
              type="number"
              min="0"
              value={newItem?.elementQuantityRequired || 0}
              onChange={(e) =>
                handleInputChange(
                  "elementQuantityRequired",
                  parseInt(e.target.value)
                )
              }
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-8 items center">
        <div className="mr-4 flex items-end flex-col">
          <label className="block text-sm font-medium text-slate-300">
            Completion Status
          </label>
          <div
            className={`mt-0.5 px-3 py-0.5 text-sm rounded-full inline-flex items-center w-fit ${completionStatus.className}`}
          >
            {completionStatus.text}
          </div>
        </div>
        <div>
          <button
            onClick={handleAddItem}
            disabled={!formValid}
            className={`px-6 py-3 rounded-lg text-white font-medium transition-all
          ${
            formValid
              ? "bg-emerald-600 hover:bg-emerald-700 transition-opacity duration-200 ease-in-out"
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
    </div>
  );
}
