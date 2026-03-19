"use client";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-600 text-on-primary hover:bg-primary-500 disabled:bg-primary-900 disabled:opacity-50",
  ghost: "bg-transparent text-current hover:bg-on-primary/10 disabled:opacity-50",
  outline: "border border-neutral-300 dark:border-neutral-700 text-current hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-3 text-base gap-2",
};

export function Button({ variant = "primary", size = "md", loading = false, disabled, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={["inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed", variantClasses[variant], sizeClasses[size], className].join(" ")}
      {...props}
    >
      {loading ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : children}
    </button>
  );
}
