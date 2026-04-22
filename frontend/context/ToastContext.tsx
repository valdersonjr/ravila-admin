"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
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

let _nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useState<Map<number, ReturnType<typeof setTimeout>>>(() => new Map())[0];

  const showToast = useCallback((message: string, variant: Variant = "success") => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.delete(id);
    }, 3500);
    timers.set(id, timer);
  }, [timers]);

  useEffect(() => {
    return () => { timers.forEach(clearTimeout); };
  }, [timers]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== "undefined" && createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none items-center">
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
