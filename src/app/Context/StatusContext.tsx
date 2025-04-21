// src/app/Context/StatusContext.tsx

"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  ReactElement,
  FC,
} from "react";
import StatusMessage from "../Components/Misc/StatusMessage";

type StatusType = "success" | "error" | "warning" | "info";
type PositionType = "top" | "bottom";

type StatusOptions = {
  position?: PositionType;
  autoCloseDelay?: number;
};

type StatusContextType = {
  showSuccess: (message: string, options?: StatusOptions) => void;
  showError: (message: string, options?: StatusOptions) => void;
  showWarning: (message: string, options?: StatusOptions) => void;
  showInfo: (message: string, options?: StatusOptions) => void;
  hideStatus: () => void;
};

type StatusState = {
  show: boolean;
  type: StatusType;
  message: string;
  position: PositionType;
  autoCloseDelay: number | undefined;
};

/**
 * Context for managing status messages throughout the application
 */
const StatusContext = createContext<StatusContextType | undefined>(undefined);

interface StatusProviderProps {
  children: ReactNode;
}

/**
 * Provider component for status message functionality
 */
export const StatusProvider: FC<StatusProviderProps> = ({
  children,
}): ReactElement => {
  const [status, setStatus] = useState<StatusState>({
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
   * @param {StatusOptions} options - Additional options like position and autoCloseDelay
   */
  const showSuccess = useCallback(
    (message: string, options: StatusOptions = {}): void => {
      setStatus({
        show: true,
        type: "success",
        message,
        position: options.position || "top",
        autoCloseDelay: options.autoCloseDelay,
      });
    },
    []
  );

  /**
   * Shows an error message
   *
   * @param {string} message - The message to display
   * @param {StatusOptions} options - Additional options like position and autoCloseDelay
   */
  const showError = useCallback(
    (message: string, options: StatusOptions = {}): void => {
      setStatus({
        show: true,
        type: "error",
        message,
        position: options.position || "top",
        autoCloseDelay: options.autoCloseDelay,
      });
    },
    []
  );

  /**
   * Shows a warning message
   *
   * @param {string} message - The message to display
   * @param {StatusOptions} options - Additional options like position and autoCloseDelay
   */
  const showWarning = useCallback(
    (message: string, options: StatusOptions = {}): void => {
      setStatus({
        show: true,
        type: "warning",
        message,
        position: options.position || "top",
        autoCloseDelay: options.autoCloseDelay,
      });
    },
    []
  );

  const showInfo = useCallback(
    (message: string, options: StatusOptions = {}): void => {
      setStatus({
        show: true,
        type: "info",
        message,
        position: options.position || "top",
        autoCloseDelay: options.autoCloseDelay,
      });
    },
    []
  );

  /**
   * Hides the current status message
   */
  const hideStatus = useCallback((): void => {
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
};

export function useStatus(): StatusContextType {
  const context = useContext(StatusContext);

  if (context === undefined) {
    throw new Error("useStatus must be used within a StatusProvider");
  }

  return context;
}
