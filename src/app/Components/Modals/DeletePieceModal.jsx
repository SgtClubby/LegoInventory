// src/app/Components/Modals/DeletePieceModal.jsx

import { useLego } from "@/Context/LegoContext";
import { useStatus } from "@/Context/StatusContext";
import { DeleteForeverRounded, DeleteRounded } from "@mui/icons-material";
import { useEffect } from "react";

export default function DeletePieceModal() {
  const {
    setPiecesByTable,
    piecesByTable,
    pieceToDelete,
    setPieceToDelete,
    setDeleteModalOpen,
    selectedTable,
  } = useLego();
  const { showSuccess } = useStatus();

  const isMinifig = selectedTable?.isMinifig;
  const piece = pieceToDelete?.piece;

  const handleDeletePiece = async (uuid) => {
    const tableId = selectedTable.id;

    // Optimistically remove from UI first
    setPiecesByTable((prev) => {
      const updatedPieces = prev[tableId]?.filter((p) => p.uuid !== uuid) || [];
      return { ...prev, [tableId]: updatedPieces };
    });

    try {
      // Then delete from database
      const response = await fetch(`/api/table/${tableId}/brick/${uuid}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete piece: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting piece:", error);

      // If deletion fails, restore the piece in UI
      setPiecesByTable((prev) => {
        const restoredPiece = pieces.find((p) => p.uuid === uuid);
        if (!restoredPiece) return prev;

        const updatedPieces = [...(prev[tableId] || []), restoredPiece];
        return { ...prev, [tableId]: updatedPieces };
      });
    }
  };

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, []);

  function handleDelete() {
    if (pieceToDelete) {
      handleDeletePiece(pieceToDelete.id);
      showSuccess(
        `${isMinifig ? "Minifig" : "Piece"} ${
          pieceToDelete.piece.elementName || pieceToDelete.piece.minifigName
        } deleted`,
        {
          position: "top",
          autoCloseDelay: 3000,
        }
      );
      setDeleteModalOpen(false);
      setPieceToDelete(null);
    }
  }

  const handleClose = () => {
    setDeleteModalOpen(false);
  };

  const handleConfirmDelete = () => {
    handleDelete();
    setDeleteModalOpen(false);
  };

  console.log(pieceToDelete);

  return (
    <div className="z-[10000] fixed inset-0 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div
        className="absolute inset-0 z-0 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
        onClick={handleClose}
      ></div>

      {/* Modal content */}
      <div className="z-[10001] bg-slate-800 rounded-xl border border-slate-700 shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 ease-in-out animate-modalAppear">
        <div className="p-6">
          <div className="w-16 h-16 bg-rose-600/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <DeleteRounded className="h-8 w-8 text-rose-500" fontSize="large" />
          </div>

          <h2 className="text-2xl font-semibold text-white text-center mb-3">
            Delete LEGO {isMinifig ? "Minifig" : "Piece"}?
          </h2>

          {piece && (
            <div className="bg-slate-700/50 rounded-lg border border-slate-600/50 p-4 mb-5 flex items-center gap-4">
              {!isMinifig ? (
                piece.availableColors?.find(
                  (color) => color.colorId == piece.elementColorId
                )?.elementImage && (
                  <img
                    src={
                      piece.availableColors.find(
                        (color) => color.colorId == piece.elementColorId
                      ).elementImage
                    }
                    alt={piece.elementName}
                    className="w-12 h-12 object-cover rounded"
                  />
                )
              ) : (
                <img
                  src={piece.minifigImage}
                  alt={piece.minifigName}
                  className="w-12 h-12 object-cover rounded"
                />
              )}
              {isMinifig ? (
                <div>
                  <p className="font-semibold text-white">
                    {piece.minifigName}
                  </p>

                  <p className="text-sm text-slate-300">
                    <span className="text-slate-400">ID:</span>{" "}
                    {piece.minifigIdRebrickable} {piece.minifigIdBricklink}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-white">
                    {piece.elementName}
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="text-slate-400">ID:</span>{" "}
                    {piece.elementId} |{" "}
                    <span className="text-slate-400">Color:</span>{" "}
                    {piece.elementColor}
                  </p>
                </div>
              )}
            </div>
          )}

          <p className="mb-6 text-slate-300 text-center">
            This action cannot be undone. The {isMinifig ? "minifig" : "piece"}{" "}
            will be permanently removed from your inventory.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4">
            <button
              onClick={handleClose}
              className="inline-flex justify-center items-center px-4 py-2.5 border border-slate-600 text-slate-200 font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors duration-200"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmDelete}
              className="inline-flex justify-center items-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors duration-200"
            >
              <DeleteForeverRounded className="h-5 w-5 mr-2" />
              Delete {isMinifig ? "Minifig" : "Piece"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
