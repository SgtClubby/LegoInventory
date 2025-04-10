// src/app/components/Table/PieceRowColumns/PeiceComplete.jsx

export default function PieceCompleted({ piece, colBase, columnWidths }) {
  const { countComplete } = piece;

  return (
    <div className={`${colBase} ${columnWidths.complete} flex-1`}>
      <div
        className={`text-sm px-2 py-1 rounded-full inline-flex items-center ${
          countComplete == null
            ? "bg-gray-300 text-gray-900"
            : countComplete
            ? "bg-green-200 text-green-800"
            : "bg-red-200 text-red-800"
        }`}
      >
        {countComplete == null ? "General" : countComplete ? "Yes" : "No"}
      </div>
    </div>
  );
}
