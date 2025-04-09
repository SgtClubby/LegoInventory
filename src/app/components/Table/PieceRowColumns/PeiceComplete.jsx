/**
* PeiceComplete.jsx
* @author bulbasaur
* @description 
* @created 2025-04-09T11:49:46.920Z+02:00
* @copyright None 
* None
* @last-modified 2025-04-09T13:50:44.127Z+02:00
*/

export default function PieceCompleted({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const {
    elementId,
    elementName,
    elementColor,
    elementImage,
    elementQuantityOnHand,
    elementQuantityRequired,
    countComplete,
  } = piece;

  return (
    <div className={`${colBase} ${columnWidths.complete} flex-1`}>
      <div
        className={`text-sm px-2 py-1 rounded-full inline-flex items-center ${
          countComplete == null
            ? "bg-gray-100"
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
