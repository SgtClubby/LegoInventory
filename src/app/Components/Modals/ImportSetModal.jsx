// src/app/Components/Modals/ImportSetModal.jsx

import { useEffect, useState } from "react";
import { useImportSetSubmit } from "@/hooks/useImportSetSubmit";
import { VerticalAlignBottomRounded } from "@mui/icons-material";
import { useStatus } from "@/Context/StatusContext";
import { useLego } from "@/Context/LegoContext";
import LoaderIcon from "../Misc/LoaderIcon";

export default function ImportSetModal({ toggleModal, searchResult }) {
  const [setDetails, setSetDetails] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const handleImportSetSubmit = useImportSetSubmit();
  const { setActiveTab } = useLego();
  const { showSuccess, showError, showWarning } = useStatus();

  // Handle set import search result
  useEffect(() => {
    if (searchResult?.set_num) {
      setSetDetails(searchResult);
    }
  }, [searchResult]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, []);

  // Handle set import submission
  const handleSubmit = async () => {
    if (!setDetails) return;

    setIsImporting(true);

    try {
      await handleImportSetSubmit(setDetails);
      setActiveTab("all");
      toggleModal(false);
    } catch (error) {
      showError(`Failed to import set: ${error.message}`, {
        position: "top",
        autoCloseDelay: 5000,
      });
      console.error("Error importing set:", error);
      // We'll leave the modal open so they can try again
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (isImporting) return; // Prevent closing during import
    toggleModal(false);
  };

  return (
    <div className="z-[10000] fixed inset-0 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div
        className="absolute inset-0 z-0 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
        onClick={handleClose}
      ></div>

      {/* Modal content */}
      <div className="z-[10001] bg-slate-800 rounded-xl border border-slate-700 shadow-xl max-w-lg w-full mx-4 transform transition-all duration-300 ease-in-out animate-modalAppear">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-white text-center mb-4">
            Import LEGO Set
          </h2>

          {setDetails && (
            <div className="my-6">
              <div className="bg-slate-700/50 rounded-lg border border-slate-600/50 p-5">
                <h3 className="text-xl font-semibold text-white text-center mb-4">
                  {setDetails.name}
                </h3>

                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="relative">
                    <img
                      loading="lazy"
                      src={setDetails.set_img_url}
                      alt={setDetails.name}
                      className="w-52 h-auto rounded-md shadow-md border border-slate-600 transition-transform duration-200 hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                      {setDetails.set_num}
                    </div>
                  </div>

                  <div className="space-y-3 text-md w-full">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-600/50">
                      <span className="text-slate-300">Set Number:</span>
                      <span className="text-white font-medium">
                        {setDetails.set_num}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-slate-600/50">
                      <span className="text-slate-300">Released:</span>
                      <span className="text-white font-medium">
                        {setDetails.year}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-slate-600/50">
                      <span className="text-slate-300">Piece Count:</span>
                      <span className="text-white font-medium">
                        {setDetails.num_parts}
                      </span>
                    </div>

                    <div className="bg-amber-900/30 border border-amber-800/30 rounded-lg p-3 text-amber-200 text-sm">
                      <p>A new table will be created for this set.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end mt-6">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className={`inline-flex justify-center items-center px-4 py-2.5 border border-slate-600 text-slate-200 font-medium rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors duration-200 ${
                isImporting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isImporting || !setDetails}
              className={`inline-flex justify-center items-center px-4 py-2.5 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                isImporting
                  ? "bg-blue-700 text-white cursor-wait"
                  : setDetails
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-600 text-slate-300 cursor-not-allowed"
              }`}
            >
              {isImporting ? (
                <>
                  <LoaderIcon className="h-5 w-5 mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <VerticalAlignBottomRounded className="h-5 w-5 mr-2" />
                  Import Set
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
