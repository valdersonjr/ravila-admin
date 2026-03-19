import { SelectHTMLAttributes } from "react";

interface SelectOption { value: string; label: string; }
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ options, placeholder, className = "", ...props }: SelectProps) {
  return (
    <select className={["w-full rounded-md px-3 py-2 text-sm bg-background text-foreground border border-border outline-none focus:ring-2 focus:ring-primary-500 transition-shadow", className].join(" ")} {...props}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
}
