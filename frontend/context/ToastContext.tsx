"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

type Variant = "success" | "error";
interface Toast { id: number; message: string; variant: Variant; }
interface ToastContextType { showToast: (message: string, variant?: Variant) => void; }

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });
export function useToast() { return useContext(ToastContext); }

const variantClasses: Record<Variant, string> = {
  success: "bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-800",
  error: "bg-rose-100 text-rose-600 border-rose-300 dark:bg-rose-900 dark:text-rose-400",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, variant: Variant = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className={["px-4 py-3 rounded-lg border text-sm font-medium shadow-lg", variantClasses[toast.variant]].join(" ")}>
              {toast.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
