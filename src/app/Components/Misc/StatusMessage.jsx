// src/app/Components/Misc/StatusMessage.jsx

"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircleOutlined,
  ErrorOutlined,
  WarningAmberOutlined,
  InfoOutlined,
  CloseRounded,
} from "@mui/icons-material";

/**
 * Status message component that displays various types of notifications
 *
 * @param {Object} props - Component props
 * @param {string} props.type - Message type: "success", "error", "warning", "info"
 * @param {string} props.message - The message text to display
 * @param {boolean} props.show - Whether the message is visible
 * @param {string} props.position - Position on screen: "top", "bottom" (default: "top")
 * @param {function} props.onClose - Function to call when the message is closed
 * @param {number | undefined} props.autoCloseDelay - Time in ms before auto-closing (default: 5000, 0 to disable)
 * @returns {JSX.Element} The status message component
 */
export default function StatusMessage({
  type = "info",
  message,
  show = false,
  onClose,
  autoCloseDelay = 5000,
  position = "top",
}) {
  // Animation state
  const [animationClass, setAnimationClass] = useState("");
  // Visibility state (separate from props.show to handle exit animations)
  const [isVisible, setIsVisible] = useState(false);

  // Handle auto-close timer
  useEffect(() => {
    let timer;

    // If message becomes visible and auto-close is enabled
    if (show && autoCloseDelay > 0) {
      timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);
    }

    // Set visibility state based on show prop
    if (show) {
      setIsVisible(true);
      setAnimationClass("animate-enter");
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [show, autoCloseDelay]);

  // Handle closing animation
  const handleClose = useCallback(() => {
    setAnimationClass("animate-exit");
    // Wait for animation to finish before calling onClose
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  }, [onClose]);

  // Don't render anything if not visible
  if (!isVisible && !show) return null;

  // Get the icon and colors based on message type
  const messageConfig = {
    success: {
      icon: <CheckCircleOutlined className="h-5 w-5" />,
      bgColor: "bg-emerald-600/20",
      borderColor: "border-emerald-500/30",
      textColor: "text-emerald-400",
      iconColor: "text-emerald-500",
    },
    error: {
      icon: <ErrorOutlined className="h-5 w-5" />,
      bgColor: "bg-rose-600/20",
      borderColor: "border-rose-500/30",
      textColor: "text-rose-400",
      iconColor: "text-rose-500",
    },
    warning: {
      icon: <WarningAmberOutlined className="h-5 w-5" />,
      bgColor: "bg-amber-600/20",
      borderColor: "border-amber-500/30",
      textColor: "text-amber-400",
      iconColor: "text-amber-500",
    },
    info: {
      icon: <InfoOutlined className="h-5 w-5" />,
      bgColor: "bg-blue-600/20",
      borderColor: "border-blue-500/30",
      textColor: "text-blue-400",
      iconColor: "text-blue-500",
    },
  };

  const config = messageConfig[type] || messageConfig.info;

  // Position classes
  const positionClasses = position === "bottom" ? "bottom-6" : "top-6";

  // Animation classes
  const enterAnimations = {
    top: "animate-slideInDown",
    bottom: "animate-slideInUp",
  };

  const exitAnimations = {
    top: "animate-slideOutUp",
    bottom: "animate-slideOutDown",
  };

  // Get the correct animation based on position and state
  const getAnimationClass = () => {
    if (animationClass === "animate-enter") {
      return enterAnimations[position] || enterAnimations.top;
    } else if (animationClass === "animate-exit") {
      return exitAnimations[position] || exitAnimations.top;
    }
    return "";
  };

  return (
    <div
      className={`fixed z-[9999] left-1/2 transform ${positionClasses} 
                    flex justify-center transition-all duration-300 ${getAnimationClass()}`}
    >
      <div
        className={`${config.bgColor} ${config.borderColor} border backdrop-blur-md 
                       rounded-lg shadow-lg py-3 px-4 min-w-72 max-w-md flex items-center gap-3`}
      >
        <div className={`${config.iconColor}`}>{config.icon}</div>

        <p className={`${config.textColor} text-sm font-medium flex-1`}>
          {message}
        </p>

        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-slate-300 transition-colors"
          aria-label="Close"
        >
          <CloseRounded className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
