// src/app/components/Table/VirtualTableHeader.jsx

import useBreakpoints from "@/hooks/useBreakpoint";

export default function VirtualTableHeader({ sort, sortConfig, columnWidths }) {
  const { isSm, isMd, isLg, isXl } = useBreakpoints();

  const colBase =
    "text-left font-semibold py-3 px-4 text-gray-100 md:text-sm text-xs";

  const sortable = (label, key) => (
    <div
      onClick={() => sort(key)}
      className="cursor-pointer select-none flex items-center"
    >
      <span>{label}</span>
      <span className="ml-1">
        {sortConfig.key === key &&
          (sortConfig.direction === "ascending" ? "↑" : "↓")}
      </span>
    </div>
  );

  return (
    <div className="w-full inline-flex bg-slate-800 sticky top-0 z-10 border-b border-slate-700">
      <div className={`${colBase} ${columnWidths.image} flex-shrink-0`}> </div>
      <div className={`${colBase} ${columnWidths.name} flex-1`}>
        {sortable("Name", "elementName")}
      </div>
      <div className={`${colBase} ${columnWidths.id} flex-1`}>
        {sortable("ID", "elementId")}
      </div>
      <div className={`${colBase} ${columnWidths.color} flex-1`}>
        {sortable("Color", "elementColor")}
      </div>
      <div className={`${colBase} ${columnWidths.onHand} flex-1`}>
        {sortable("On Hand", "elementQuantityOnHand")}
      </div>
      <div className={`${colBase} ${columnWidths.required} flex-1`}>
        {sortable("Required", "elementQuantityRequired")}
      </div>
      <div className={`${colBase} ${columnWidths.complete} flex-1`}>
        {sortable("Complete", "countComplete")}
      </div>
      <div className={`${colBase} ${columnWidths.actions} flex-1`}>Actions</div>
    </div>
  );
}
