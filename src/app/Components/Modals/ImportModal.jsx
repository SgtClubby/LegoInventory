// src/app/components/Modals/ImportModal.jsx

import { useImportSetSubmit } from "@/hooks/useImportSetSubmit";
import { useEffect, useState } from "react";

export default function ImportModal({ toggleModal, searchResult }) {
  const [setDetails, setSetDetails] = useState(null);
  const handleImportSetSubmit = useImportSetSubmit();

  // ---------------------------
  // Handle set import search result
  // ---------------------------

  useEffect(() => {
    if (searchResult?.set_num) {
      setSetDetails(searchResult);
    }
  }, [searchResult]);

  // ---------------------------
  // Handle escape key to close modal
  // ---------------------------
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
    toggleModal(false);
    setSetDetails(null);
    handleImportSetSubmit(setDetails);
  };

  const handleClose = () => {
    toggleModal(false);
  };

  return (
    <div className="z-[10000] fixed inset-0 flex items-center justify-center">
      <div className="absolute z-[10000] bg-slate-800 p-6 rounded shadow-lg w-fit">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">
          Import set?
        </h2>
        <p className="mb-4 text-gray-100">
          Are you sure you want to import this set?
        </p>
        {setDetails && (
          <div className="my-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-100 text-center">
              {setDetails.name}
            </h2>
            <div className="flex gap-6 items-center text-gray-100">
              <img
                loading="lazy"
                src={setDetails.set_img_url}
                alt={setDetails.name}
                className="w-52 h-auto rounded-md shadow-md border border-gray-600"
              />
              <div className="space-y-2 text-md">
                <p>
                  <span className="font-semibold text-gray-300">Set ID:</span>{" "}
                  <span className="text-gray-200">{setDetails.set_num}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-300">
                    Piece count:
                  </span>{" "}
                  <span className="text-gray-200">{setDetails.num_parts}</span>
                </p>
                <p>
                  <span className="font-semibold text-gray-300">Released:</span>{" "}
                  <span className="text-gray-200">{setDetails.year}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-slate-700 mt-6">
          <button onClick={handleClose} className="cancel-btn">
            Cancel
          </button>
          <button onClick={() => handleSubmit(setDetails)} className="blue-btn">
            Import Set
          </button>
        </div>
      </div>
      <div
        className="absolute inset-0 z-0 bg-black opacity-50"
        onClick={handleClose}
      ></div>
    </div>
  );
}
