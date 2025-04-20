// src/app/Components/Main/AddNewPieceForm.jsx

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

// Icons
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Add,
  ErrorOutlineRounded,
  InsertPhotoRounded,
} from "@mui/icons-material";

// Components
import SearchNewPiece from "@/Components/Search/SearchNewPiece";
import SearchNewMinifig from "@/Components/Search/SearchNewMinifig";

// Functions and Helpers
import colors from "@/Colors/colors.js";
import { useLego } from "@/Context/LegoContext";
import { addPieceToTable } from "@/lib/Pieces/PiecesManager";
import getColorStyle from "@/lib/Misc/getColorStyle";
import { useStatus } from "@/Context/StatusContext";
import TableSelectDropdown from "../Misc/TableSelectDropdown";
import { set } from "lodash";
import LoaderIcon from "../Misc/LoaderIcon";

/**
 * Form component for adding new pieces or minifigs to a table
 */
export default function AddNewPieceForm() {
  // Context
  const { setPiecesByTable, selectedTable, setActiveTab } = useLego();
  const { showSuccess, showError, showWarning } = useStatus();

  // Determine if we're working with a minifig or regular piece
  const isMinifig = selectedTable?.isMinifig || false;

  // Component state
  const [searchNewPieceResult, setSearchNewPieceResult] = useState(null);
  const [searchNewMinifigResult, setSearchNewMinifigResult] = useState(null);

  // New piece/minifig state - initialized based on type
  const [newItem, setNewItem] = useState(() => initializeNewItem(isMinifig));

  // UI state
  const [image, setImage] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [blDataLoading, setBlDataLoading] = useState(false);
  const [blDataLoadingFailed, setBlDataLoadingFailed] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [fade, setFade] = useState(false);

  /**
   * Initialize a new empty item based on type
   *
   * @param {boolean} isMinifig - Whether the item is a minifig
   * @returns {Object} Initialized item object
   */
  function initializeNewItem(isMinifig) {
    if (isMinifig) {
      return {
        uuid: uuidv4(),
        minifigName: "",
        minifigIdRebrickable: "",
        minifigIdBricklink: "",
        minifigImage: "",
        minifigQuantity: 0,
        priceData: {
          currency: "N/A",
          minPriceNew: "N/A",
          maxPriceNew: "N/A",
          avgPriceNew: "N/A",
          minPriceUsed: "N/A",
          maxPriceUsed: "N/A",
          avgPriceUsed: "N/A",
        },
      };
    } else {
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
      };
    }
  }

  // Reset form when switching table types
  useEffect(() => {
    setNewItem(initializeNewItem(isMinifig));
    setImage(null);
    setImageLoading(false);
    setSearchNewPieceResult(null);
    setSearchNewMinifigResult(null);
    setShowColorDropdown(false);
    setFormValid(false);
    setBlDataLoadingFailed(false);
    setBlDataLoading(false);
  }, [isMinifig, selectedTable?.id]);

  // Validate form
  useEffect(() => {
    if (isMinifig) {
      const isValid = Boolean(
        newItem.minifigName && newItem.minifigIdRebrickable
      );
      setFormValid(isValid);
    } else {
      const isValid = Boolean(
        newItem.elementName && newItem.elementId && newItem.elementColor
      );
      setFormValid(isValid);
    }
  }, [newItem, isMinifig]);

  // Update newItem when regular piece search result arrives
  useEffect(() => {
    if (!isMinifig && searchNewPieceResult) {
      setNewItem(initializeNewItem(false)); // Reset to initial state
      const { part_num, name, part_img_url } = searchNewPieceResult;

      // First update the basic information
      setNewItem((prev) => ({
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
          setNewItem((current) => ({
            ...current,
            availableColors: colorData,
          }));

          // If there are colors available, set the first one as default
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
          console.error("Error fetching colors:", error);
        } finally {
          setImageLoading(false);
        }
      };

      fetchColors();
    }
  }, [searchNewPieceResult, isMinifig, showError]);

  // Update newItem when minifig search result arrives
  useEffect(() => {
    if (isMinifig && searchNewMinifigResult) {
      setBlDataLoadingFailed(false);
      setNewItem(initializeNewItem(true)); // Reset to initial state

      const { minifigIdRebrickable, minifigName, minifigImage } =
        searchNewMinifigResult;

      setNewItem((prev) => {
        return {
          ...prev,
          uuid: uuidv4(),
          minifigIdRebrickable,
          minifigName,
          minifigImage,
          minifigQuantity: 1,
        };
      });

      setImage(searchNewMinifigResult.minifigImage);

      async function fetchBricklinkData() {
        setBlDataLoading(true);

        const res = await fetch(`/api/bricklink`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            minifigIdRebrickable,
            minifigName,
            minifigImage,
          }),
        });

        if (!res.ok) {
          setBlDataLoading(false);
          setBlDataLoadingFailed(true);
          showError(
            `Error fetching BrickLink data: ${res.statusText} ${res.status}`,
            {
              autoCloseDelay: 5000,
            }
          );
          return;
        }

        const bricklinkData = await res.json();
        if (bricklinkData.error) {
          setBlDataLoading(false);
          setBlDataLoadingFailed(true);
          showError(`Error fetching BrickLink data: ${bricklinkData.error}`, {
            autoCloseDelay: 5000,
          });
          return;
        }
        // Update price data if available
        if (bricklinkData?.priceData) {
          const priceData = bricklinkData.priceData;
          setNewItem((prev) => ({
            ...prev,
            minifigIdBricklink: bricklinkData.minifigIdBricklink,
            priceData: {
              minPriceNew: priceData.minPriceNew,
              maxPriceNew: priceData.maxPriceNew,
              avgPriceNew: priceData.avgPriceNew,
              minPriceUsed: priceData.minPriceUsed,
              maxPriceUsed: priceData.maxPriceUsed,
              avgPriceUsed: priceData.avgPriceUsed,
              currencyCode: priceData.currencyCode,
              currencySymbol: priceData.currencySymbol,
            },
          }));
          setBlDataLoading(false);
          return;
        }
      }
      fetchBricklinkData();
    }
  }, [searchNewMinifigResult, isMinifig]);

  // Update image when color changes for regular pieces
  useEffect(() => {
    if (!isMinifig) {
      if (
        newItem.elementColorId &&
        newItem.elementId &&
        newItem.availableColors.length === 0
      ) {
        // Don't reset the image until we get a new one
        const fetchImage = async () => {
          try {
            const response = await fetch(
              `/api/image/${newItem.elementId}/${newItem.elementColorId}`
            );
            const data = await response.json();

            if (data && data.part_img_url) {
              setImage(data.part_img_url);
              setFade(false); // Reset fade flag, then it will become true when image loads
            }
          } catch (error) {
            // Don't set image to null here - keep the existing image
            showError("Error fetching piece image.", {
              autoCloseDelay: 5000,
            });
            console.error("Error fetching image:", error);
          }
        };
        fetchImage();
      } else {
        const colorData = newItem?.availableColors?.find(
          (color) => color.colorId == newItem.elementColorId
        );
        if (colorData && colorData.elementImage) {
          setImage(colorData.elementImage);
          setFade(false); // Reset fade flag, then it will become true when image loads
        }
      }
    }
  }, [
    newItem.elementColorId,
    newItem.elementId,
    newItem.availableColors,
    isMinifig,
    showError,
  ]);

  /**
   * Handle input change for form fields
   *
   * @param {string} field - Field name to update
   * @param {any} value - New value for the field
   */
  const handleInputChange = (field, value) => {
    setNewItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle color selection for regular pieces
   *
   * @param {string} colorName - Selected color name
   */
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

  /**
   * Handle adding new piece or minifig
   */
  const handleAddItem = async () => {
    if (!formValid) {
      showWarning("Please fill in all required fields.", {
        autoCloseDelay: 3000,
      });
      return;
    }

    const tableId = selectedTable.id;

    if (isMinifig) {
      await addMinifig(tableId);
    } else {
      await addPiece(tableId);
    }

    setActiveTab("all");

    // Reset form state
    setSearchNewPieceResult(null);
    setSearchNewMinifigResult(null);
    setImage(null);
    setImageLoading(false);
    setNewItem(initializeNewItem(isMinifig));
  };

  /**
   * Add a new minifig
   *
   * @param {string} tableId - Table ID
   */
  const addMinifig = async (tableId) => {
    // Add new minifig
    const updatedNewMinifig = {
      ...newItem,
      uuid: uuidv4(),
    };

    // Update local state
    setPiecesByTable((prev) => {
      const tablePieces = prev[tableId] || [];
      return { ...prev, [tableId]: [...tablePieces, updatedNewMinifig] };
    });

    // Save new minifig via API call
    try {
      const response = await fetch(`/api/table/${tableId}/minifig`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedNewMinifig),
      });

      if (!response.ok) {
        throw new Error("Failed to add minifig");
      }

      // Show success message
      showSuccess("Minifig added successfully!", {
        position: "top",
        autoCloseDelay: 3000,
      });
    } catch (error) {
      showError("Error adding minifig. Please try again later.", {
        autoCloseDelay: 5000,
      });
      console.error("Error adding minifig:", error);
    }
  };

  /**
   * Add a new regular piece
   *
   * @param {string} tableId - Table ID
   */
  const addPiece = async (tableId) => {
    // Add new regular piece
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

    // Update local state
    setPiecesByTable((prev) => {
      const tablePieces = prev[tableId] || [];
      return { ...prev, [tableId]: [...tablePieces, updatedNewPiece] };
    });

    // Save new piece via API call
    const success = await addPieceToTable(updatedNewPiece, tableId);
    if (!success) {
      showError("Error adding piece. Please try again later.", {
        autoCloseDelay: 5000,
      });
      return;
    }

    // Show success message
    showSuccess("Piece added successfully!", {
      position: "top",
      autoCloseDelay: 3000,
    });
  };

  /**
   * Color dropdown component for regular pieces
   */
  const ColorDropdown = () => {
    // Filter colors to show available ones first, if we have availability data
    const availableColorIds = newItem.availableColors.map((c) => c.colorId);
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

  // Calculate the completion status text and class
  const getCompletionStatus = () => {
    if (!isMinifig) {
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
    }
  };

  // Get current completion status
  const completionStatus = getCompletionStatus();

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
      <h2 className="text-2xl font-semibold text-white mb-6">
        Add New {isMinifig ? "Minifig" : "Piece"}
      </h2>

      {/* Search (Left) and Image (Right) */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Left: Search */}
        <div className="flex flex-col w-full">
          <div className="w-full ">
            {isMinifig ? (
              <SearchNewMinifig
                searchNewMinifigResult={searchNewMinifigResult}
                setSearchNewMinifigResult={setSearchNewMinifigResult}
              />
            ) : (
              <SearchNewPiece
                searchNewPieceResult={searchNewPieceResult}
                setSearchNewPieceResult={setSearchNewPieceResult}
              />
            )}
          </div>
          <div className="w-full mt-4 relative">
            <TableSelectDropdown />
            <p className="mt-2 text-xs text-slate-400">
              Select the table where you want to add this{" "}
              {isMinifig ? "minifig" : "piece"}. If you don't see your table,
              you can create one in the "Browse All Pieces" tab.
            </p>
          </div>
        </div>

        {/* Right: Image Preview */}
        <div className="w-full sm:w-1/3 mt-6 md:-mt-2 flex justify-center sm:justify-end">
          <div className="md:min-w-60 md:min-h-60 w-50 h-50 bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
            {imageLoading ? (
              <div className="animate-pulse w-full h-full bg-slate-600" />
            ) : image ? (
              <img
                key={image}
                src={`${image}?t=${new Date().getTime()}`} // optional cache-buster
                alt={isMinifig ? newItem.minifigName : newItem.elementName}
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

      {/* Form Fields in a Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Column 1: Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={
                (isMinifig ? newItem?.minifigName : newItem?.elementName) || ""
              }
              onChange={(e) =>
                handleInputChange(
                  isMinifig ? "minifigName" : "elementName",
                  e.target.value
                )
              }
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder={isMinifig ? "'Darth Vader'" : "Brick 2x4"}
            />
          </div>

          {!isMinifig ? (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">
                ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                disabled={isMinifig}
                value={
                  (!isMinifig
                    ? newItem?.elementId
                    : newItem?.minifigIdBricklink) || ""
                }
                onChange={(e) => handleInputChange("elementId", e.target.value)}
                className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder={isMinifig ? "e.g. sw0001" : "e.g. 3001"}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">
                  Bricklink ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      (isMinifig
                        ? newItem?.minifigIdBricklink
                        : newItem?.elementId) || ""
                    }
                    disabled={!isMinifig}
                    onChange={(e) =>
                      handleInputChange("minifigIdBricklink", e.target.value)
                    }
                    className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                    focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder={
                      isMinifig ? "e.g. 'sw1234', 'pir1234'" : "e.g. '3001'"
                    }
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    {blDataLoading ? <LoaderIcon className="h-5 w-5" /> : null}
                  </div>
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-slate-400">
                    {blDataLoadingFailed && !newItem.minifigIdBricklink ? (
                      <div className="flex flex-row items-center">
                        <ErrorOutlineRounded className="h-5 w-5 text-red-500/80 mr-2" />
                        <div className="flex flex-col items-start">
                          <span className="text-slate-300 text-xs">
                            Failed to load BrickLink data!
                          </span>
                          <span className="text-slate-300 text-xs">
                            Enter manually or try again!
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-300">
                  Rebrickable ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={
                    (isMinifig
                      ? newItem?.minifigIdRebrickable
                      : newItem?.elementId) || ""
                  }
                  disabled={!isMinifig}
                  onChange={(e) =>
                    handleInputChange("minifigIdRebrickable", e.target.value)
                  }
                  className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                          focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder={isMinifig ? "e.g. 'fig-123456'" : "e.g. '3001'"}
                />
              </div>
            </>
          )}
          {isMinifig ? (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">
                Quantity Owned
              </label>
              <input
                type="number"
                min="1"
                defaultValue="1"
                disabled={!isMinifig}
                value={
                  (isMinifig ? newItem?.minifigQuantity : newItem?.elementId) ||
                  1
                }
                onChange={(e) =>
                  handleInputChange(
                    "minifigQuantity",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
              focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">
                Quantity On Hand
              </label>
              <input
                type="number"
                min="0"
                disabled={isMinifig}
                value={
                  (!isMinifig
                    ? newItem?.elementQuantityOnHand
                    : newItem?.minifigQuantity) || 0
                }
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
          )}
        </div>

        {/* Column 2: Color/Price & Quantity */}
        <div className="flex flex-col space-y-4 justify-between">
          {/* Color for pieces or Price Info for minifigs */}
          {!isMinifig ? (
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
          ) : (
            <div className="relative">
              {blDataLoading && (
                <div className="absolute inset-0 bg-slate-800 opacity-50 rounded-lg flex items-center justify-center">
                  <LoaderIcon className="h-8 w-8 text-slate-400" />
                </div>
              )}
              {blDataLoadingFailed && (
                <div className="absolute inset-0 bg-slate-800 opacity-50 rounded-lg flex items-center justify-center">
                  <ErrorOutlineRounded className="h-8 w-8 text-red-500" />
                  <span className="text-slate-200 text-sm ml-2">
                    Failed to load BrickLink data
                  </span>
                </div>
              )}
              <label className="block text-sm font-medium mb-1.5 text-slate-300">
                Price Information
              </label>
              <div className="p-4 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 shadow-inner">
                <div className="mb-3 pb-2 border-b border-slate-600">
                  <h3 className="text-sm font-medium text-emerald-400 mb-2">
                    New Condition
                  </h3>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                    <span className="text-xs text-slate-400">Min:</span>
                    <span className="text-sm text-slate-200 font-medium col-span-2">
                      {newItem.priceData?.minPriceNew !== "N/A" ? (
                        `$${newItem.priceData?.minPriceNew.toFixed(2)}`
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">Avg:</span>
                    <span className="text-sm text-slate-200 font-medium col-span-2">
                      {newItem.priceData?.avgPriceNew !== "N/A" ? (
                        `$${newItem.priceData?.avgPriceNew.toFixed(2)}`
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">Max:</span>
                    <span className="text-sm text-slate-200 font-medium col-span-2">
                      {newItem.priceData?.maxPriceNew !== "N/A" ? (
                        `$${newItem.priceData?.maxPriceNew.toFixed(2)}`
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Used Section */}
                <div>
                  <h3 className="text-sm font-medium text-emerald-400 mb-2">
                    Used Condition
                  </h3>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                    <span className="text-xs text-slate-400">Min:</span>
                    <span className="text-sm text-slate-200 font-medium col-span-2">
                      {newItem.priceData?.minPriceUsed !== "N/A" ? (
                        `$${newItem.priceData?.minPriceUsed.toFixed(2)}`
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">Avg:</span>
                    <span className="text-sm text-slate-200 font-medium col-span-2">
                      {newItem.priceData?.avgPriceUsed !== "N/A" ? (
                        `$${newItem.priceData?.avgPriceUsed.toFixed(2)}`
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">Max:</span>
                    <span className="text-sm text-slate-200 font-medium col-span-2">
                      {newItem.priceData?.maxPriceUsed !== "N/A" ? (
                        `$${newItem.priceData?.maxPriceUsed.toFixed(2)}`
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Currency note */}
                <div className="mt-3 pt-2 border-t border-slate-600 text-right">
                  <span className="text-xs text-slate-400">
                    Currency: {newItem.priceData?.currency || "USD"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quantity Required */}
          {!isMinifig && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-300">
                Quantity Required
              </label>
              <input
                type="number"
                min="0"
                disabled={isMinifig}
                value={
                  (!isMinifig
                    ? newItem?.elementQuantityRequired
                    : newItem?.minifigQuantity) || 0
                }
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
          )}
        </div>
      </div>

      {/* Add Button */}

      <div className="flex justify-end mt-8 items center">
        {!isMinifig && (
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
        )}
        <div>
          <button
            onClick={handleAddItem}
            disabled={!formValid || blDataLoading}
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
              Add {isMinifig ? "Minifig" : "Piece"}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
