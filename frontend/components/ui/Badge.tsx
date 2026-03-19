type Variant = "primary" | "neutral" | "success" | "warning" | "error";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300",
  neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  success: "bg-success-100 text-success-600 dark:bg-success-900 dark:text-success-300",
  warning: "bg-warning-100 text-warning-600 dark:bg-warning-900 dark:text-warning-300",
  error: "bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400",
};

export function Badge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: Variant }) {
  return (
    <span className={["inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variantClasses[variant]].join(" ")}>
      {children}
    </span>
  );
}
