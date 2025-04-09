import { useEffect } from "react";

export default function TableDeleteModal({ toggleModal, handleSubmit }) {
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

  const handleClose = () => {
    toggleModal(false);
  };

  return (
    <div className="z-20 fixed inset-0 flex items-center justify-center">
      <div className="absolute z-20 bg-slate-800 p-6 rounded shadow-lg w-80">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">
          Delete table?
        </h2>
        <p className="mb-4 text-gray-100">
          Are you sure you want to delete this table? This action cannot be
          undone.
        </p>
        <div className="flex gap-6 justify-end">
          <button onClick={handleClose} className="cancel-btn">
            Cancel
          </button>
          <button onClick={handleSubmit} className="red-btn">
            Delete
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
