// src/app/components/Table/PieceTable.jsx
import { useState, useMemo, useCallback } from "react";

// Icons
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// Components
import SearchPiece from "@/Components/Search/SearchPiece";
import { addTable, deleteTable } from "@/lib/Table/TableManager";
import TableAddModal from "../Modals/TableAddModal";
import TableDeleteModal from "../Modals/TableDeleteModal";
import { useLego } from "@/Context/LegoContext";
import { debounce } from "lodash";
import { fetchPartDetails } from "@/lib/Pieces/PiecesManager";
import VirtualTable from "./VirtualTable";

import colors from "@/Colors/colors";
import { fetchImageForPiece } from "@/lib/Pieces/Images/fetchImages";

export default function PieceTable() {
  const {
    availableTables,
    setAvailableTables,
    selectedTable,
    setSelectedTable,
    piecesByTable,
    setPiecesByTable,
  } = useLego();

  const [showAddModal, setAddShowModal] = useState(false);
  const [showDeleteModal, setDeleteShowModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // ---------------------------
  // Helper functions for debounced patch of piece data
  // ---------------------------
  const debouncedPatch = useCallback(
    debounce(async (uuid, tableId, patchPayload) => {
      await fetch(`/api/table/${tableId}/brick/${uuid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
        },
        body: JSON.stringify(patchPayload),
      });
    }, 750),
    []
  );

  // Helper: Update a piece in state
  const updatePieceField = (tableId, uuid, updates) => {
    setPiecesByTable((prev) => {
      const updatedPieces =
        prev[tableId]?.map((p) =>
          p.uuid === uuid ? { ...p, ...updates } : p
        ) || [];
      return { ...prev, [tableId]: updatedPieces };
    });
  };

  async function quickPatch(uuid, tableId, payload) {
    updatePieceField(tableId, uuid, payload);
    await fetch(`/api/table/${tableId}/brick/${uuid}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  // ---------------------------
  // Handle piece update (debounced)
  // ---------------------------
  const handleUpdatePiece = async (uuid, field, value) => {
    const tableId = selectedTable.id;
    const currentPiece = piecesByTable[tableId]?.find((p) => p.uuid === uuid);
    if (!currentPiece) return;

    // Create a new updated piece object
    const updatedPiece = { ...currentPiece, [field]: value };

    if (field === "elementColor") {
      const colorId = colors.find((c) => c.colorName === value)?.colorId;
      updatedPiece.elementColorId = colorId;
    }

    if (
      field === "elementQuantityOnHand" ||
      field === "elementQuantityRequired"
    ) {
      updatedPiece.countComplete =
        updatedPiece.elementQuantityRequired === 0
          ? null
          : updatedPiece.elementQuantityOnHand >=
            updatedPiece.elementQuantityRequired;
    }

    // Build the patch payload
    const patchPayload = {
      [field]: updatedPiece[field],
    };

    if (field === "elementColor") {
      patchPayload.elementColorId = updatedPiece.elementColorId;
    }

    if (
      field === "elementQuantityOnHand" ||
      field === "elementQuantityRequired"
    ) {
      patchPayload.countComplete = updatedPiece.countComplete;
    }

    debouncedPatch(uuid, tableId, patchPayload);
    updatePieceField(tableId, uuid, updatedPiece);

    // If elementId changed, update elementName via fetched part details (without recursion)
    if (field === "elementId") {
      const partDetails = await fetchPartDetails(value);
      if (partDetails?.name) {
        await quickPatch(uuid, tableId, {
          elementName: partDetails.name,
        });
      }
    }

    if (field === "elementId" || field === "elementColor") {
      const elementId = field === "elementId" ? value : currentPiece.elementId;
      const colorId =
        field === "elementColor"
          ? colors.find((c) => c.colorName === value)?.colorId
          : currentPiece.elementColorId;

      const img_part_url = await fetchImageForPiece(elementId, colorId);
      await quickPatch(uuid, tableId, {
        elementImage: img_part_url,
      });
    }
  };

  // ---------------------------
  // Handle delete piece
  // ---------------------------
  const handleDeletePiece = async (uuid) => {
    if (!confirm("Are you sure you want to delete this piece?")) return;
    const tableId = selectedTable.id;
    await fetch(`/api/table/${tableId}/brick/${uuid}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });
    updatePieceField(tableId, uuid, null); // We'll filter it out below
    setPiecesByTable((prev) => {
      const updated = prev[tableId]?.filter((p) => p.uuid !== uuid) || [];
      return { ...prev, [tableId]: updated };
    });
  };

  // Handle table selection using id for consistency
  const handleTableSelect = (event) => {
    const selectedId = event.target.value;
    const table = availableTables.find((table) => table.id === selectedId);
    setSelectedTable(table);
  };

  // Trigger modal open when user clicks "Add table"
  const handleAddTable = () => {
    setAddShowModal(true);
  };

  const handleDeleteTable = () => {
    setDeleteShowModal(true);
  };

  // When the modal is submitted, add the new table
  const handleAddModalSubmit = async () => {
    const newId = Math.max(...availableTables.map((t) => t.id)) + 1;
    const newTable = {
      id: newId.toString(),
      name: newTableName || `Table ${newId}`,
    };
    const updatedTables = [...availableTables, newTable];

    setAvailableTables(updatedTables);

    addTable(newTableName || `Table ${newId}`); // Call the API to add the table

    setAddShowModal(false);
    setNewTableName("");
  };

  // When the modal is submitted, add the new table
  const handleDeleteModalSubmit = () => {
    // Remove table from availableTables
    const updatedTables = availableTables.filter(
      (table) => table.id != selectedTable.id
    );
    setAvailableTables(updatedTables);
    deleteTable(selectedTable.id); // Call the API to delete the table

    // Hide the modal
    setDeleteShowModal(false);

    // If the deleted table was selected, default to the first table or null if none exist.
    setSelectedTable(updatedTables.find((t) => t.id === 1) || null);
  };

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  // Function to handle sorting
  const sort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // ---------------------------
  // Memoized current pieces for selected table
  // ---------------------------
  const pieces = useMemo(() => {
    return piecesByTable[selectedTable?.id] || [];
  }, [piecesByTable, selectedTable?.id]);

  const filteredPieces = useMemo(() => {
    if (!debouncedSearchTerm) return pieces;

    const lower = debouncedSearchTerm.toLowerCase();
    const regex = new RegExp(
      lower
        .split(" ")
        .map((word) => `(?=.*${word})`)
        .join(""),
      "i"
    );

    return pieces.filter(
      (piece) =>
        regex.test(piece.elementName) ||
        regex.test(piece.elementId.toString()) ||
        regex.test(piece.elementColor)
    );
  }, [pieces, debouncedSearchTerm]);

  // Apply sorting
  const sortedPieces = useMemo(() => {
    let sortable = [...filteredPieces];

    if (sortConfig.key) {
      sortable.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return sortable;
  }, [filteredPieces, sortConfig]);

  return (
    <div>
      <div className="bg-slate-700 rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-800 border-b">
          {/* Table control header (Table select / Piece search) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            {/* Search input - full width on mobile, fits in row on md+ */}
            <div className="flex-1 w-full md:max-w-[320px]">
              <SearchPiece
                setSearchTerm={setDebouncedSearchTerm}
                searchTerm={debouncedSearchTerm}
              />
            </div>

            {/* Grouped table controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              {/* Label + Select Table */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label
                  htmlFor="tableSelect"
                  className="text-gray-100 whitespace-nowrap"
                >
                  Select Table:
                </label>
                <select
                  id="tableSelect"
                  value={selectedTable ? selectedTable.id : 1}
                  onChange={handleTableSelect}
                  className="border border-gray-300 rounded-lg p-2 text-gray-100 bg-slate-800"
                >
                  {availableTables.map((table) => (
                    <option
                      className="text-gray-100 bg-slate-800"
                      key={table.id}
                      value={table.id}
                    >
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add / Remove buttons */}
              <div className="flex gap-3 sm:ml-4 flex-wrap">
                <button
                  onClick={handleAddTable}
                  className="flex items-center text-gray-100 hover:text-gray-400"
                >
                  <AddCircleOutlineIcon className="mr-1" />
                  Add
                </button>

                {selectedTable?.id > 1 && (
                  <button
                    onClick={handleDeleteTable}
                    className="flex items-center text-gray-100 hover:text-gray-400"
                  >
                    <DeleteOutlineIcon className="mr-1 text-red-500" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <VirtualTable
          pieces={sortedPieces}
          onChange={(field, id, value) => handleUpdatePiece(id, field, value)}
          onDelete={(id) => handleDeletePiece(id)}
          sort={sort}
          sortConfig={sortConfig}
        />
      </div>

      {/* Modal for adding a new table */}
      {showAddModal && (
        <TableAddModal
          setNewTableName={setNewTableName}
          newTableName={newTableName}
          toggleModal={setAddShowModal}
          handleSubmit={handleAddModalSubmit}
        />
      )}
      {/* Modal for deleting a table */}
      {showDeleteModal && (
        <TableDeleteModal
          toggleModal={setDeleteShowModal}
          handleSubmit={handleDeleteModalSubmit}
        />
      )}
    </div>
  );
}
