import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({ leftIcon, rightIcon, className = "", ...props }: InputProps) {
  return (
    <div className="flex items-center w-full rounded-md overflow-hidden bg-background border border-border focus-within:ring-2 focus-within:ring-primary-500 transition-shadow">
      {leftIcon && <span className="pl-3 text-muted shrink-0">{leftIcon}</span>}
      <input className={["flex-1 px-3 py-2 text-sm bg-transparent text-foreground placeholder:text-muted outline-none", className].join(" ")} {...props} />
      {rightIcon && <span className="pr-3 text-muted shrink-0">{rightIcon}</span>}
    </div>
  );
}
