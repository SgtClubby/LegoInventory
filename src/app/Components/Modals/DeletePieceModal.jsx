// src/app/Components/Modals/DeletePieceModal.jsx

// Contexts
import { useLegoState } from "@/Context/LegoStateContext";
import { useModalState } from "@/Context/ModalContext";
import { useStatus } from "@/Context/StatusContext.tsx";

// Icons
import { DeleteForeverRounded, DeleteRounded } from "@mui/icons-material";

// Helpers
import { apiFetch } from "@/lib/API/client/apiFetch";
import { useEffect } from "react";

export default function DeletePieceModal() {
  // Contexts
  const { setPiecesByTable, setPieceToDelete, selectedTable } = useLegoState();
  const { setDeleteModalOpen, pieceToDelete } = useModalState();
  const { showSuccess } = useStatus();

  // One time states
  const isMinifig = selectedTable?.isMinifig;
  const piece = pieceToDelete?.piece;
  const tableId = selectedTable.id;

  const handleDeletePiece = async (uuid) => {
    try {
      // Then delete from database
      // Check if the piece is a minifig or not
      let deleteReq;

      if (isMinifig) {
        // If it's a minifig, delete the minifig from the database
        deleteReq = await apiFetch(`/table/${tableId}/minifigs/${uuid}`, {
          method: "DELETE",
        });
      } else {
        // If it's a piece, delete the piece from the database
        deleteReq = await apiFetch(`/table/${tableId}/bricks/${uuid}`, {
          method: "DELETE",
        });
      }

      if (deleteReq.error) {
        throw new Error(deleteReq.error || "Failed to delete piece");
      }

      setPiecesByTable((prev) => {
        const updatedPieces =
          prev[tableId]?.filter((p) => p.uuid !== uuid) || [];
        return { ...prev, [tableId]: updatedPieces };
      });
    } catch (error) {
      console.error("Error deleting piece:", error);
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
