// src/app/Components/Table/PieceTable.jsx

// Functions and Helpers
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { debounce } from "lodash";
import { useLego } from "@/Context/LegoContext";
import { fetchPartDetails, fetchPartColors } from "@/lib/Pieces/PiecesManager";
import colors from "@/Colors/colors.js";

// Components
import VirtualTable from "@/Components/Table/VirtualTable";
import SearchPiece from "@/Components/Search/SearchPiece";
import FilterTabs from "@/Components/Misc/FilterTabs";
import TableSelectDropdown from "@/Components/Misc/TableSelectDropdown";

export default function PieceTable({ newTableName, setNewTableName }) {
  const {
    availableTables,
    selectedTable,
    setSelectedTable,
    piecesByTable,
    setPiecesByTable,
    setAddShowModal,
    setDeleteShowModal,
  } = useLego();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "ascending",
  });
  const pendingUpdatesRef = useRef(new Map());
  const [updatingPieces, setUpdatingPieces] = useState(new Set());
  const requestIdentifier = useRef(0);

  // Active view state
  const [activeView, setActiveView] = useState("all"); // "all", "incomplete", "complete"

  // Memoized current pieces for selected table
  const pieces = useMemo(() => {
    return piecesByTable[selectedTable?.id] || [];
  }, [piecesByTable, selectedTable?.id]);

  const isMinifig = selectedTable?.isMinifig;

  /**
   * Helper function to clear updating state for a piece
   */
  const clearUpdatingState = useCallback((uuid) => {
    setUpdatingPieces((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uuid);
      return newSet;
    });
  }, []);

  /**
   * Helper function to mark a piece as updating
   */
  const setUpdatingState = useCallback((uuid) => {
    setUpdatingPieces((prev) => {
      const newSet = new Set(prev);
      newSet.add(uuid);
      return newSet;
    });
  }, []);

  /**
   * Updates a piece in the database with debouncing
   */
  const updatePieceInDb = useCallback(
    debounce(async (uuid, tableId, updates, isMinifig = true) => {
      try {
        let response;
        if (isMinifig) {
          console.log("[DBUpdate] Updating Minifig:", uuid, updates);
          response = await fetch(`/api/table/${tableId}/minifig/${uuid}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          });
        } else {
          console.log("[DBUpdate] Updating Brick:", uuid, updates);
          response = await fetch(`/api/table/${tableId}/brick/${uuid}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          });
        }

        if (!response.ok) {
          throw new Error(
            `Failed to update piece: ${response.status} ${response.statusText}`
          );
        }

        // Remove from pending updates after successful save
        const updateKey = `${tableId}-${uuid}`;
        pendingUpdatesRef.current.delete(updateKey);

        // Remove from updating state
        clearUpdatingState(uuid);

        return true;
      } catch (error) {
        console.error("Error updating piece:", error);
        clearUpdatingState(uuid);
        return false;
      }
    }, 450),
    [clearUpdatingState]
  );

  /**
   * Updates piece in local state immediately for responsive UI
   */
  const updateLocalPiece = useCallback(
    (uuid, tableId, updates) => {
      setPiecesByTable((prev) => {
        // If the table doesn't exist in state yet, return unchanged
        if (!prev[tableId]) return prev;

        // Create a new array for the table's pieces, with the updated piece
        const updatedPieces = prev[tableId].map((piece) =>
          piece.uuid === uuid ? { ...piece, ...updates } : piece
        );

        // Return new state object with updated table pieces
        return {
          ...prev,
          [tableId]: updatedPieces,
        };
      });
    },
    [setPiecesByTable]
  );

  const checkIsUpdating = useCallback(
    (uuid) => {
      return updatingPieces.has(uuid);
    },
    [updatingPieces]
  );

  useEffect(() => {
    // Clear pending updates when the component unmounts
    return () => {
      pendingUpdatesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    // clear updating after interval
    const interval = setInterval(() => {
      setUpdatingPieces((prev) => {
        const newSet = new Set(prev);
        newSet.clear();
        return newSet;
      });
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  /**
   * Handles updating a piece's properties with debouncing and special field handling
   */
  const handleUpdateMinifig = useCallback(
    async (uuid, field, value) => {
      console.log(
        `[Update MINIFIG] Updating minifig ${uuid}: ${field} = ${value}`
      );
      const currentRequestId = ++requestIdentifier.current;
      const tableId = selectedTable.id;
      const currentMinifig = pieces.find((p) => p.uuid === uuid);

      if (!currentMinifig) return;

      // Mark piece as updating
      setUpdatingState(uuid);

      // // Cancel any pending updates for this piece
      if (updatePieceInDb.cancel) {
        updatePieceInDb.cancel();
      }
      // Create update payload
      const updates = { [field]: value };

      // Generate a unique key for this update
      const updateKey = `${tableId}-${uuid}`;

      // Store the full intended state in the pending updates map
      const previousUpdates = pendingUpdatesRef.current.get(updateKey) || {};
      const mergedUpdates = { ...previousUpdates, ...updates };
      pendingUpdatesRef.current.set(updateKey, mergedUpdates);

      // Update local state immediately for responsive UI
      updateLocalPiece(uuid, tableId, updates);

      // Schedule database update for the combined state
      updatePieceInDb(uuid, tableId, mergedUpdates, true);
    },
    [
      pieces,
      selectedTable,
      updatingPieces,
      updateLocalPiece,
      updatePieceInDb,
      setUpdatingState,
      clearUpdatingState,
    ]
  );
  const handleUpdatePiece = useCallback(
    async (uuid, field, value) => {
      console.log(`[Update BRICK] Updating brick ${uuid}: ${field} = ${value}`);
      const currentRequestId = ++requestIdentifier.current;
      const tableId = selectedTable.id;
      const currentPiece = pieces.find((p) => p.uuid === uuid);

      if (!currentPiece) return;

      // Mark piece as updating
      setUpdatingState(uuid);

      // Special case for elementId, set to "0" if empty
      if (field === "elementId" && (!value || value.length === 0)) {
        value = "0";
      }

      // Create update payload
      const updates = { [field]: value };

      // Preserve invalid state if present
      if (currentPiece.invalid === true) {
        updates.invalid = true;
      }

      // Special field handling
      if (field === "elementColor") {
        // When color changes, we need to update both the color name and ID
        const colorObj = colors.find((c) => c.colorName === value);
        if (colorObj) {
          updates.elementColorId = colorObj.colorId;
        }
      } else if (field === "elementColorId") {
        // Similarly, when ID changes, update the color name too
        const colorObj = colors.find((c) => c.colorId === value);
        if (colorObj) {
          updates.elementColor = colorObj.colorName;
        }
      }

      if (
        field === "elementQuantityOnHand" ||
        field === "elementQuantityRequired"
      ) {
        const onHand =
          field === "elementQuantityOnHand"
            ? parseInt(value)
            : parseInt(currentPiece.elementQuantityOnHand);

        const required =
          field === "elementQuantityRequired"
            ? parseInt(value)
            : parseInt(currentPiece.elementQuantityRequired);

        // Use consistent logic for countComplete regardless of which field is updated
        const isComplete = required === 0 ? null : onHand >= required;

        if (field === "elementQuantityOnHand") {
          updates.elementQuantityOnHand = onHand;
        } else {
          updates.elementQuantityRequired = required;
        }

        // Always set countComplete using the same logic
        updates.countComplete = isComplete;
      }

      if (field === "highlighted") {
        updates.highlighted = value;
      }

      // Generate a unique key for this update
      const updateKey = `${tableId}-${uuid}`;

      // Store the full intended state in the pending updates map
      const previousUpdates = pendingUpdatesRef.current.get(updateKey) || {};
      const mergedUpdates = { ...previousUpdates, ...updates };
      pendingUpdatesRef.current.set(updateKey, mergedUpdates);

      // Update local state immediately for responsive UI
      updateLocalPiece(uuid, tableId, updates);

      // Schedule database update for the combined state
      updatePieceInDb(uuid, tableId, mergedUpdates, false);

      // Handle special cases that need additional API calls
      if (field === "elementId") {
        console.log("Handling elementId update");
        try {
          // Fetch part details in parallel
          if (!value || value.length === 0) {
            value = "0";
          }

          if (currentRequestId !== requestIdentifier.current) {
            clearUpdatingState(uuid);
            return;
          }

          const partDetailsPromise = fetchPartDetails(value);
          const availableColorsPromise = fetchPartColors(value);

          const [partDetails, availableColors] = await Promise.all([
            partDetailsPromise,
            availableColorsPromise,
          ]);

          // After receiving API responses, check again if this is still the latest request
          if (currentRequestId !== requestIdentifier.current) {
            clearUpdatingState(uuid);
            return;
          }

          console.log("Fetched color and piece data");

          const additionalUpdates = {};

          // Update name if available
          if (partDetails?.name) {
            additionalUpdates.elementName = partDetails.name;
            if (updates.invalid) additionalUpdates.invalid = false;
          } else {
            // Only update to "Invalid/Missing ID" if it's not already that value
            if (currentPiece.elementName !== "Invalid/Missing ID") {
              additionalUpdates.elementName = "Invalid/Missing ID";
            }
            if (!updates.invalid) additionalUpdates.invalid = true;
          }

          // Update available colors if found
          if (availableColors?.length > 0) {
            additionalUpdates.availableColors = availableColors;

            // Check if current color exists in available colors
            const currentColorExists = availableColors.some(
              (c) =>
                String(c.colorId) === String(currentPiece.elementColorId) ||
                c.color === currentPiece.elementColor
            );

            // If current color isn't available, select the first one
            if (
              (!currentColorExists && availableColors.length > 0) ||
              (partDetails?.name && currentPiece.elementColorId)
            ) {
              additionalUpdates.elementColor = availableColors[0].color;
              additionalUpdates.elementColorId = availableColors[0].colorId;
            }
          } else {
            // We have fetched an invalid ID, so set colors to reflect this
            if (!currentPiece.availableColors?.[0]?.empty) {
              additionalUpdates.availableColors = [{ empty: true }];
            }

            // Only reset colors if they currently have values
            if (
              currentPiece.elementColorId != null ||
              currentPiece.elementColor != null
            ) {
              additionalUpdates.elementColorId = null;
              additionalUpdates.elementColor = null;
            }
            // If we did fetch a valid ID, but no colors, we can set the color to "default"
            if (
              partDetails?.name &&
              currentPiece.elementColorId == null &&
              currentPiece.elementColor == null
            ) {
              additionalUpdates.elementColor =
                availableColors[0]?.color || null;
              additionalUpdates.elementColorId =
                availableColors[0]?.colorId || null;
            }
          }

          // If we have additional updates, apply them
          if (Object.keys(additionalUpdates).length > 0) {
            // Get the latest pending updates for this piece
            const currentUpdates =
              pendingUpdatesRef.current.get(updateKey) || {};
            const finalUpdates = { ...currentUpdates, ...additionalUpdates };
            pendingUpdatesRef.current.set(updateKey, finalUpdates);

            // Update local state first
            updateLocalPiece(uuid, tableId, additionalUpdates);

            // Send update to database with all accumulated changes
            updatePieceInDb(uuid, tableId, finalUpdates, false);
          } else {
            // Make sure we clear the updating state since we're done
            clearUpdatingState(uuid);
          }
        } catch (error) {
          console.error("Error handling elementId update:", error);
          // Ensure we clear the updating state on error
          clearUpdatingState(uuid);
        }
      }
    },
    [
      pieces,
      selectedTable,
      colors,
      updatingPieces,
      updateLocalPiece,
      updatePieceInDb,
      setUpdatingState,
      clearUpdatingState,
      fetchPartDetails,
      fetchPartColors,
    ]
  );

  // Sorting function
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Filter pieces based on search term and active view
  const filteredPieces = useMemo(() => {
    let filteredByStatus = pieces;

    // First filter by status
    if (activeView === "complete") {
      filteredByStatus = pieces.filter((piece) => piece.countComplete === true);
    } else if (activeView === "incomplete") {
      filteredByStatus = pieces.filter(
        (piece) => piece.countComplete === false
      );
    }

    // Then filter by search term
    if (!searchTerm) return filteredByStatus;

    const lower = searchTerm.toLowerCase();

    return filteredByStatus.filter(
      (piece) =>
        piece.elementName?.toLowerCase().includes(lower) ||
        piece.elementId?.toString().includes(lower) ||
        piece.elementColor?.toLowerCase().includes(lower) ||
        piece.minifigIdRebrickable?.toString().includes(lower) ||
        piece.minifigIdBricklink?.toString().includes(lower) ||
        piece.minifigName?.toString().includes(lower)
    );
  }, [pieces, searchTerm, activeView]);

  // Apply sorting to filtered pieces
  const sortedPieces = useMemo(() => {
    if (!sortConfig.key) return filteredPieces;

    return [...filteredPieces].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Compare values
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredPieces, sortConfig]);

  // Stats
  const pieceStats = useMemo(() => {
    const totalRequired = pieces.reduce(
      (acc, piece) => acc + (piece.elementQuantityRequired || 0),
      0
    );
    const totalOnhand = pieces.reduce(
      (acc, piece) => acc + (piece.elementQuantityOnHand || 0),
      0
    );
    // cap at 100%
    const percentage = Math.min(
      Math.round((totalOnhand / totalRequired) * 100),
      100
    );

    const complete = pieces.filter((p) => p.countComplete === true).length;
    const incomplete = pieces.filter((p) => p.countComplete === false).length;
    const general = pieces.filter((p) => p.countComplete === null).length;

    const showCompletion = pieces.some(
      (piece) => piece.elementQuantityRequired > 0
    );

    return {
      showCompletion,
      totalRequired,
      totalOnhand,
      complete,
      incomplete,
      general,
      percentage,
    };
  }, [pieces]);

  const minifigStats = useMemo(() => {
    const collection = pieces.length;

    let totalQuantity = 0;
    let totalUsedValue = 0;
    let totalNewValue = 0;

    for (const piece of pieces) {
      const quantity = piece?.minifigQuantity || 1;
      const avgUsed = piece?.priceData?.avgPriceUsed || 0;
      const avgNew = piece?.priceData?.avgPriceNew || 0;

      totalQuantity += quantity;
      totalUsedValue += avgUsed * quantity;
      totalNewValue += avgNew * quantity;
    }

    return {
      collection,
      totalQuantity,
      totalUsedValue: Number(totalUsedValue.toFixed(2)),
      totalNewValue: Number(totalNewValue.toFixed(2)),
    };
  }, [pieces]);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-slate-800 rounded-xl shadow-lg  border border-slate-700">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col xl:flex-row xl:items-end gap-6">
            {/* Table Selection */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-semibold text-white transition-all duration-200 ease-in-out">
                  {selectedTable ? selectedTable.name : "Select a Table"}
                </h3>
              </div>
              {/* Table Select Dropdown */}
              <p className="mb-2 text-xs text-slate-400">
                Select your table. If you don't have any tables, create by
                clicking the "+" button in the dropdown.
              </p>
              <TableSelectDropdown />
            </div>

            {/* Search & Filters */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Search & Filter
                </h3>

                <div className="text-sm font-medium text-slate-300">
                  {filteredPieces.length}
                  <span className="text-slate-400"> of </span>
                  {pieces.length} {isMinifig ? "minifigs" : "pieces"}
                </div>
              </div>
              <p className="mb-2 text-xs text-slate-400 -mt-3">
                {isMinifig
                  ? `Search for a minifig by name or ID.`
                  : `Search for a piece by name, ID, or color. Use the filter tabs to
                filter by completion.`}
              </p>
              <div className="flex flex-col md:flex-row gap-3 w-full">
                <div className="flex-1 w-full md:w-[50%] ">
                  {/* Search Input */}
                  <SearchPiece
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                  />
                </div>

                {/* View Tabs */}
                <div className="h-12 w-full md:w-[50%]  rounded-lg overflow-hidden">
                  <FilterTabs
                    setActiveView={setActiveView}
                    activeView={activeView}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-700">
            {/* Piece Stats */}
            {pieceStats.showCompletion && (
              <>
                <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                  <div className="h-3 w-3 rounded-full bg-slate-400 mr-2"></div>
                  <span className="text-slate-300 mr-2">Total Pieces:</span>
                  <span className="text-white font-semibold">
                    {pieceStats.totalRequired}
                  </span>
                </div>
                <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                  <div className="h-3 w-3 rounded-full bg-slate-400 mr-2"></div>
                  <span className="text-slate-300 mr-2">Total On-Hand:</span>
                  <span className="text-white font-semibold">
                    {pieceStats.totalOnhand}
                  </span>
                </div>
                <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      pieceStats.percentage >= 100
                        ? "bg-emerald-500" // Overachiever zone
                        : pieceStats.percentage >= 80
                        ? "bg-green-400" // Solid, very good
                        : pieceStats.percentage >= 60
                        ? "bg-yellow-400" // Above average, safe
                        : pieceStats.percentage >= 40
                        ? "bg-amber-500" // Warning, below average
                        : pieceStats.percentage >= 20
                        ? "bg-orange-500" // Risky, poor
                        : "bg-rose-600" // Critical zone
                    } mr-2`}
                  ></div>
                  <span className="text-slate-300 mr-2">Completion:</span>
                  <span className="text-white font-semibold">
                    {pieceStats.percentage}%
                  </span>
                </div>
                <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 mr-2"></div>
                  <span className="text-slate-300 mr-2">Completed:</span>
                  <span className="text-white font-semibold">
                    {pieceStats.complete}
                  </span>
                </div>
                <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                  <div className="h-3 w-3 rounded-full bg-rose-500 mr-2"></div>
                  <span className="text-slate-300 mr-2">Incomplete:</span>
                  <span className="text-white font-semibold">
                    {pieceStats.incomplete}
                  </span>
                </div>
              </>
            )}
            {pieceStats.general > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                <div className="h-3 w-3 rounded-full bg-slate-500 mr-2"></div>
                <span className="text-slate-300 mr-2">General:</span>
                <span className="text-white font-semibold">
                  {pieceStats.general}
                </span>
              </div>
            )}
            {/* Minifig Stats */}
            {isMinifig && (
              <>
                {minifigStats.collection > 0 && (
                  <>
                    <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                      <div className="h-3 w-3 rounded-full bg-slate-500 mr-2"></div>
                      <span className="text-slate-300 mr-2">Collected:</span>
                      <span className="text-white font-semibold">
                        {minifigStats.collection}
                      </span>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                      <div className="h-3 w-3 rounded-full bg-slate-500 mr-2"></div>
                      <span className="text-slate-300 mr-2">
                        Total Quantity:
                      </span>
                      <span className="text-white font-semibold">
                        {minifigStats.totalQuantity}
                      </span>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                      <div className="h-3 w-3 rounded-full bg-slate-500 mr-2"></div>
                      <span className="text-slate-300 mr-2">
                        Total Value (Used):
                      </span>
                      <span className="text-white font-semibold">
                        ${minifigStats.totalUsedValue.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                      <div className="h-3 w-3 rounded-full bg-slate-500 mr-2"></div>
                      <span className="text-slate-300 mr-2">
                        Total Value (New):
                      </span>
                      <span className="text-white font-semibold">
                        ${minifigStats.totalNewValue.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table Component */}
      <VirtualTable
        pieces={sortedPieces}
        onChange={
          selectedTable?.isMinifig ? handleUpdateMinifig : handleUpdatePiece
        }
        isUpdating={checkIsUpdating}
        sort={handleSort}
        sortConfig={sortConfig}
      />

      {/* Modal for adding a new table */}
    </div>
  );
}
