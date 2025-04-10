// src/app/components/Misc/Statistics.jsx

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function Statistics({ pieces }) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-800 p-4 rounded-lg shadow text-gray-100">
        <h3 className="font-semibold text-lg mb-2 text-gray-100">
          Inventory Summary
        </h3>
        <p>Total Pieces: {pieces.length}</p>
        <p>Complete: {pieces.filter((p) => p.countComplete).length}</p>
        <p>Incomplete: {pieces.filter((p) => !p.countComplete).length}</p>
      </div>
      <div className="bg-slate-800 p-4 rounded-lg shadow text-gray-100">
        <h3 className="font-semibold text-lg mb-2 text-gray-100">
          Missing Pieces
        </h3>
        <p>
          Total Missing:{" "}
          {pieces.reduce(
            (acc, piece) =>
              acc +
              Math.max(
                0,
                piece.elementQuantityRequired - piece.elementQuantityOnHand
              ),
            0
          )}
        </p>
      </div>
      <div className="bg-slate-800 p-4 rounded-lg shadow text-gray-100">
        <h3 className="font-semibold text-lg mb-2 text-gray-100">Help</h3>
        <p className="flex items-center text-sm text-gray-100">
          <InfoOutlinedIcon size={16} className="mr-2 text-blue-500" />
          Click on column headers to sort
        </p>
        <p className="flex items-center text-sm mt-1 text-gray-100">
          <InfoOutlinedIcon size={16} className="mr-2 text-blue-500" />
          Green rows indicate complete items
        </p>
      </div>
    </div>
  );
}
