// src/app/Components/Main/Tabs.jsx

import { useLegoState } from "@/Context/LegoStateContext";
import {
  Add,
  FilterListRounded,
  ImportExportRounded,
  VerticalAlignBottomRounded,
  Menu as MenuIcon,
  Close as CloseIcon,
  MenuOpenRounded,
  MenuRounded,
  AppsRounded,
} from "@mui/icons-material";
import { MenuItem } from "@mui/material";
import { useRef, useEffect, useState } from "react";

export default function Tabs({ handleTabChange }) {
  const { activeTab, selectedTable } = useLegoState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuPanelRef = useRef(null);

  // Close on ESC and handle animation
  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleCloseMenu();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Handle menu close with animation
  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsClosing(false);
    }, 100);
  };

  // Tab data for mapping
  const tabOptions = [
    {
      key: "all",
      icon: <FilterListRounded className="h-7 w-7" fontSize="large" />,
      label: selectedTable?.isMinifig ? "Browse Minifigs" : "Browse Pieces",
      bg: "bg-blue-600/30 border-blue-500",
    },
    {
      key: "add",
      icon: <Add className="h-7 w-7" fontSize="large" />,
      label: selectedTable?.isMinifig ? "Add New Minifig" : "Add New Piece",
      bg: "bg-emerald-600/30 border-emerald-500",
    },
    {
      key: "import",
      icon: <VerticalAlignBottomRounded className="h-7 w-7" fontSize="large" />,
      label: "Import Set",
      bg: "bg-amber-600/30 border-amber-500",
    },
    {
      key: "export",
      icon: <ImportExportRounded className="h-7 w-7" fontSize="large" />,
      label: "Import/Export",
      bg: "bg-rose-600/30 border-rose-500",
    },
  ];

  // Render a single tab option
  const renderTab = (tab) => (
    <div
      key={tab.key}
      className={`p-3 md:p-5 rounded-xl border ${
        activeTab === tab.key
          ? tab.bg
          : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
      } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
      onClick={() => {
        handleTabChange(tab.key);
        handleCloseMenu(); // Use the animated close
      }}
    >
      {tab.icon}
      <span className="font-medium">{tab.label}</span>
    </div>
  );

  return (
    <>
      {/* Hamburger for mobile */}
      <div className="flex sm:hidden mb-4 items-center">
        <button
          className={`py-3 w-full border ${
            tabOptions.find((tab) => tab.key === activeTab)?.bg ||
            "bg-slate-800/60"
          } rounded-lg transition-all duration-200 shadow-md flex items-center justify-center relative h-16`}
          onClick={() => (menuOpen ? handleCloseMenu() : setMenuOpen(true))}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {/* Menu icon for open state */}

          <div className="absolute h-16 text-slate-200 font-medium text-center">
            <div className="flex items-center justify-center h-full">
              <div className="mr-2">
                {tabOptions.find((tab) => tab.key === activeTab)?.icon}
              </div>
              <span className="font-medium">
                {activeTab === "all"
                  ? selectedTable?.isMinifig
                    ? "Browse Minifigs"
                    : "Browse Pieces"
                  : tabOptions.find((tab) => tab.key === activeTab)?.label}
              </span>
            </div>
          </div>

          {/* Icon container - both icons are always in the DOM */}
          <div className="absolute left-4 w-6 h-6 flex items-center justify-center">
            {/* Close icon */}
            <CloseIcon
              className="text-slate-200 absolute"
              style={{
                fontSize: "32px",
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen
                  ? "scale(1) rotate(0deg)"
                  : "scale(0.5) rotate(90deg)",
                transition: "opacity 0.2s ease, transform 0.3s ease", // Add transition directly to the component
              }}
            />

            {/* Menu icon */}
            <MenuRounded
              className="text-slate-200 absolute"
              style={{
                fontSize: "32px",
                opacity: menuOpen ? 0 : 1,
                transform: menuOpen
                  ? "scale(0.5) rotate(-90deg)"
                  : "scale(1) rotate(0deg)",
                transition: "opacity 0.2s ease, transform 0.3s ease", // Add transition directly to the component
              }}
            />
          </div>
        </button>
      </div>

      {/* Animated dropdown menu for mobile */}
      {(menuOpen || isClosing) && (
        <div
          className={`
            fixed inset-0 z-[1000] flex items-start justify-center bg-slate-900/70 backdrop-blur-sm
            sm:hidden transition-opacity duration-300
            ${isClosing ? "opacity-0" : "opacity-100"}
          `}
          onClick={handleCloseMenu}
        >
          <div
            ref={menuPanelRef}
            className={`
              mt-16 w-[90vw] max-w-sm bg-slate-800 rounded-xl shadow-xl
              flex flex-col gap-3 p-5 border border-slate-700
              ${isClosing ? "animate-slideUp" : "animate-slideDown"}
              z-[1010]
            `}
            style={{
              transition:
                "transform 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s cubic-bezier(.4,0,.2,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-700/50 pb-2 mb-1">
              <h2 className="text-lg font-medium text-slate-200">Navigation</h2>
            </div>
            {tabOptions.map((tab) => (
              <div
                key={tab.key}
                className={`p-3 md:p-5 rounded-xl border ${
                  activeTab === tab.key
                    ? tab.bg
                    : "bg-slate-800/60 border-slate-700 hover:bg-slate-800/90"
                } cursor-pointer transition-all duration-300 flex flex-col items-center justify-center`}
                onClick={() => {
                  handleTabChange(tab.key);
                  handleCloseMenu(); // Use the animated close
                }}
              >
                <span className="mb-2">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs for sm and up */}
      <div className="hidden sm:grid grid-cols-4 gap-4 mb-6 text-center">
        {tabOptions.map(renderTab)}
      </div>
    </>
  );
}
