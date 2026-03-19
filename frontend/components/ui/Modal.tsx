"use client";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function Modal({ title, message, onConfirm, onClose, loading, confirmLabel = "Confirmar", cancelLabel = "Cancelar" }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border border-border p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
