// src/app/Components/AddNewElement/AddNewMinifig.jsx

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { apiFetch } from "@/lib/API/FetchUtils";

// Icons
import {
  Add,
  ErrorOutlineRounded,
  InsertPhotoRounded,
} from "@mui/icons-material";
import LoaderIcon from "@/Components/Misc/LoaderIcon";

// Components
import SearchNewMinifig from "@/Components/Search/SearchNewMinifig";
import TableSelectDropdown from "@/Components/Misc/TableSelectDropdown";

// Contexts and Helpers
import { useLegoState } from "@/Context/LegoStateContext";
import { useStatus } from "@/Context/StatusContext.tsx";

export default function AddNewMinifig() {
  const { setPiecesByTable, selectedTable, setActiveTab } = useLegoState();
  const { showSuccess, showError, showWarning } = useStatus();

  // State
  const [searchNewMinifigResult, setSearchNewMinifigResult] = useState(null);
  const [newMinifig, setNewMinifig] = useState(initializeNewMinifig());
  const [image, setImage] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [blDataLoading, setBlDataLoading] = useState(false);
  const [blDataLoadingFailed, setBlDataLoadingFailed] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [fade, setFade] = useState(false);

  function initializeNewMinifig() {
    return {
      uuid: uuidv4(),
      minifigName: "",
      minifigIdRebrickable: "",
      minifigIdBricklink: "",
      minifigImage: "",
      minifigQuantity: 1,
      priceData: {
        currencyCode: "USD",
        currencySymbol: "$",
        minPriceNew: null,
        maxPriceNew: null,
        avgPriceNew: null,
        minPriceUsed: null,
        maxPriceUsed: null,
        avgPriceUsed: null,
      },
      highlighted: false,
    };
  }

  // Reset form when switching tables
  useEffect(() => {
    setNewMinifig(initializeNewMinifig());
    setImage(null);
    setImageLoading(false);
    setSearchNewMinifigResult(null);
    setFormValid(false);
    setBlDataLoadingFailed(false);
    setBlDataLoading(false);
  }, [selectedTable?.id]);

  // Validate form
  useEffect(() => {
    const isValid = Boolean(
      newMinifig.minifigName && newMinifig.minifigIdRebrickable
    );
    setFormValid(isValid);
  }, [newMinifig]);

  // Update newMinifig when minifig search result arrives
  useEffect(() => {
    if (searchNewMinifigResult) {
      setBlDataLoadingFailed(false);
      setNewMinifig(initializeNewMinifig());

      const { minifigIdRebrickable, minifigName, minifigImage } =
        searchNewMinifigResult;

      setNewMinifig((prev) => ({
        ...prev,
        uuid: uuidv4(),
        minifigIdRebrickable,
        minifigName,
        minifigImage,
        minifigQuantity: 1,
      }));

      setImage(minifigImage);

      async function fetchBricklinkData() {
        setBlDataLoading(true);

        const bricklinkData = await apiFetch(`/bricklink`, {
          method: "POST",
          body: JSON.stringify({
            minifigIdRebrickable,
            minifigName,
            minifigImage,
          }),
        });

        if (bricklinkData.error) {
          setBlDataLoading(false);
          setBlDataLoadingFailed(true);
          showError(`Error fetching BrickLink data: ${bricklinkData.error}`, {
            autoCloseDelay: 5000,
          });
          return;
        }

        console.log("BrickLink data:", bricklinkData);

        // Update price data if available
        if (bricklinkData?.priceData) {
          const priceData = bricklinkData.priceData;
          setNewMinifig((prev) => ({
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
        }
      }
      fetchBricklinkData();
    }
  }, [searchNewMinifigResult, showError]);

  /**
   * Handle input change for form fields
   */
  const handleInputChange = (field, value) => {
    setNewMinifig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle adding new minifig
   */
  const handleAddMinifig = async () => {
    if (!formValid) {
      showWarning("Please fill in all required fields.", {
        autoCloseDelay: 3000,
      });
      return;
    }

    const tableId = selectedTable.id;
    const updatedNewMinifig = {
      ...newMinifig,
      uuid: uuidv4(),
    };

    // Update local state
    setPiecesByTable((prev) => {
      const tablePieces = prev[tableId] || [];
      return { ...prev, [tableId]: [...tablePieces, updatedNewMinifig] };
    });

    // Save new minifig via API call
    try {
      const save = await apiFetch(`/table/${tableId}/minifigs`, {
        method: "POST",
        body: JSON.stringify(updatedNewMinifig),
      });

      if (save.error) {
        showError(`Error saving minifig: ${save.error}`, {
          autoCloseDelay: 5000,
        });
        return;
      }

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

    setActiveTab("all");
    setSearchNewMinifigResult(null);
    setImage(null);
    setImageLoading(false);
    setNewMinifig(initializeNewMinifig());
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
      <h2 className="text-2xl font-semibold text-white mb-6">
        Add New Minifig
      </h2>

      {/* Search (Left) and Image (Right) */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Left: Search */}
        <div className="flex flex-col w-full">
          <div className="w-full ">
            <SearchNewMinifig
              searchNewMinifigResult={searchNewMinifigResult}
              setSearchNewMinifigResult={setSearchNewMinifigResult}
            />
          </div>
          <div className="w-full mt-4 relative">
            <TableSelectDropdown />
            <p className="mt-2 text-xs text-slate-400">
              Select the table where you want to add this minifig. If you don't
              see your table, you can create one in the "Browse All Pieces" tab.
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
                src={`${image}?t=${new Date().getTime()}`}
                alt={newMinifig.minifigName}
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

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Column 1: Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newMinifig.minifigName || ""}
              onChange={(e) => handleInputChange("minifigName", e.target.value)}
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="'Darth Vader'"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Bricklink ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={newMinifig.minifigIdBricklink || ""}
                onChange={(e) =>
                  handleInputChange("minifigIdBricklink", e.target.value)
                }
                className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. 'sw1234', 'pir1234'"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                {blDataLoading ? <LoaderIcon className="h-5 w-5" /> : null}
              </div>
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-slate-400">
                {blDataLoadingFailed && !newMinifig.minifigIdBricklink ? (
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
              value={newMinifig.minifigIdRebrickable || ""}
              onChange={(e) =>
                handleInputChange("minifigIdRebrickable", e.target.value)
              }
              className="w-full p-3 border border-slate-600 rounded-lg bg-slate-700 text-slate-200 placeholder:text-slate-400 
                focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. 'fig-123456'"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-300">
              Quantity Owned
            </label>
            <input
              type="number"
              min="1"
              value={newMinifig.minifigQuantity || 1}
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
        </div>

        {/* Column 2: Price Info */}
        <div className="flex flex-col space-y-4 justify-between">
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
                    {newMinifig.priceData?.minPriceNew ? (
                      `$${newMinifig.priceData?.minPriceNew?.toFixed(2)}`
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">Avg:</span>
                  <span className="text-sm text-slate-200 font-medium col-span-2">
                    {newMinifig.priceData?.avgPriceNew ? (
                      `$${newMinifig.priceData?.avgPriceNew.toFixed(2)}`
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">Max:</span>
                  <span className="text-sm text-slate-200 font-medium col-span-2">
                    {newMinifig.priceData?.maxPriceNew ? (
                      `$${newMinifig.priceData?.maxPriceNew.toFixed(2)}`
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
                    {newMinifig.priceData?.minPriceUsed ? (
                      `$${newMinifig.priceData?.minPriceUsed.toFixed(2)}`
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">Avg:</span>
                  <span className="text-sm text-slate-200 font-medium col-span-2">
                    {newMinifig.priceData?.avgPriceUsed ? (
                      `$${newMinifig.priceData?.avgPriceUsed.toFixed(2)}`
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </span>
                  <span className="text-xs text-slate-400">Max:</span>
                  <span className="text-sm text-slate-200 font-medium col-span-2">
                    {newMinifig.priceData?.maxPriceUsed ? (
                      `$${newMinifig.priceData?.maxPriceUsed.toFixed(2)}`
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </span>
                </div>
              </div>
              {/* Currency note */}
              <div className="mt-3 pt-2 border-t border-slate-600 text-right">
                <span className="text-xs text-slate-400">
                  Currency: {newMinifig.priceData?.currency || "USD"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex justify-end mt-8 items center">
        <button
          onClick={handleAddMinifig}
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
            Add Minifig
          </div>
        </button>
      </div>
    </div>
  );
}
