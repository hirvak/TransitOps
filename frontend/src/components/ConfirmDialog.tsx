import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card text-card-foreground border rounded-xl shadow-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm mt-2">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-lg bg-background hover:bg-muted font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${
              isDestructive ? "bg-rose-600 hover:bg-rose-700" : "bg-primary-600 hover:bg-primary-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
