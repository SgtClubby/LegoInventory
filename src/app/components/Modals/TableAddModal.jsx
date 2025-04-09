import { useEffect } from "react";

export default function TableAddModal({
  setNewTableName,
  newTableName,
  toggleModal,
  handleSubmit,
}) {
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
    setNewTableName("");
  };

  return (
    <div className="z-20 fixed inset-0 flex items-center justify-center">
      <div className="absolute z-20 bg-slate-800 p-6 rounded shadow-lg w-80">
        <h2 className="biiig font-semibold mb-4 text-gray-100">
          Add New Table
        </h2>
        <input
          type="text"
          placeholder="Enter table name"
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          className="border border-gray-300 rounded p-2 w-full mb-4 text-gray-100 placeholder:text-gray-400"
        />
        <div className="flex justify-end gap-6">
          <button onClick={handleClose} className="cancel-btn">
            Cancel
          </button>
          <button onClick={() => handleSubmit(details)} className="blue-btn">
            Add
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
