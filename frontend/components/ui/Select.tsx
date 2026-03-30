import { SelectHTMLAttributes } from "react";

interface SelectOption { value: string; label: string; }
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  loading?: boolean;
}

export function Select({ options, placeholder, loading, className = "", ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={["w-full rounded-md px-3 py-2 text-sm bg-background text-foreground border border-border outline-none focus:ring-2 focus:ring-primary-500 transition-shadow disabled:opacity-60", className].join(" ")}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading
          ? <option value="">Carregando...</option>
          : <>
              {placeholder && <option value="" disabled>{placeholder}</option>}
              {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </>
        }
      </select>
      {loading && (
        <span className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin block" />
        </span>
      )}
    </div>
  );
}
