// src/app/Context/StatusContext.js

"use client";
import { createContext, useContext, useState, useCallback } from "react";
import StatusMessage from "@/Components/Misc/StatusMessage";

/**
 * Context for managing status messages throughout the application
 */
const StatusContext = createContext();

/**
 * Provider component for status message functionality
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Context provider with status message component
 */
export function StatusProvider({ children }) {
  const [status, setStatus] = useState({
    show: false,
    type: "info",
    message: "",
    position: "top",
    autoCloseDelay: 5000,
  });

  /**
   * Shows a success message
   *
   * @param {string} message - The message to display
   * @param {Object} options - Additional options like position and autoCloseDelay
   */
  const showSuccess = useCallback((message, options = {}) => {
    setStatus({
      show: true,
      type: "success",
      message,
      position: options.position || "top",
      autoCloseDelay: options.autoCloseDelay,
    });
  }, []);

  /**
   * Shows an error message
   *
   * @param {string} message - The message to display
   * @param {Object} options - Additional options like position and autoCloseDelay
   */
  const showError = useCallback((message, options = {}) => {
    setStatus({
      show: true,
      type: "error",
      message,
      position: options.position || "top",
      autoCloseDelay: options.autoCloseDelay,
    });
  }, []);

  /**
   * Shows a warning message
   *
   * @param {string} message - The message to display
   * @param {Object} options - Additional options like position and autoCloseDelay
   */
  const showWarning = useCallback((message, options = {}) => {
    setStatus({
      show: true,
      type: "warning",
      message,
      position: options.position || "top",
      autoCloseDelay: options.autoCloseDelay,
    });
  }, []);

  /**
   * Shows an info message
   *
   * @param {string} message - The message to display
   * @param {Object} options - Additional options like position and autoCloseDelay
   */
  const showInfo = useCallback((message, options = {}) => {
    setStatus({
      show: true,
      type: "info",
      message,
      position: options.position || "top",
      autoCloseDelay: options.autoCloseDelay,
    });
  }, []);

  /**
   * Hides the current status message
   */
  const hideStatus = useCallback(() => {
    setStatus((prev) => ({ ...prev, show: false }));
  }, []);

  return (
    <StatusContext.Provider
      value={{
        showSuccess,
        showError,
        showWarning,
        showInfo,
        hideStatus,
      }}
    >
      {children}
      <StatusMessage
        show={status.show}
        type={status.type}
        message={status.message}
        position={status.position}
        autoCloseDelay={status.autoCloseDelay}
        onClose={hideStatus}
      />
    </StatusContext.Provider>
  );
}

/**
 * Hook to use the status message functionality
 *
 * @returns {Object} Status message functions
 */
export function useStatus() {
  return useContext(StatusContext);
}
