// src/app/Context/ModalContext.js

"use client";
import { createContext, useContext, useState } from "react";

const ModalContext = createContext();

export function ModalProvider({ children }) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setAddShowModal] = useState({
    show: false,
    isMinifig: false,
  });
  const [showDeleteTableModal, setShowDeleteTableModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pieceToDelete, setPieceToDelete] = useState(null);

  return (
    <ModalContext.Provider
      value={{
        setShowImportModal,
        showImportModal,
        setAddShowModal,
        showAddModal,
        setShowDeleteTableModal,
        showDeleteTableModal,
        deleteModalOpen,
        setDeleteModalOpen,
        pieceToDelete,
        setPieceToDelete,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModalState() {
  return useContext(ModalContext);
}
