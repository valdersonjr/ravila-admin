"use client";
import { useEffect, useRef, useState } from "react";

export interface ComboboxOption { value: number | string; label: string; }

interface ComboboxProps {
  options: ComboboxOption[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function Combobox({ options, value, onChange, placeholder = "Selecionar...", disabled, loading }: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center w-full rounded-md bg-background border border-border focus-within:ring-2 focus-within:ring-primary-500 transition-shadow">
        <input
          className="flex-1 px-3 py-2 text-sm bg-transparent text-foreground placeholder:text-muted outline-none disabled:opacity-50"
          placeholder={selected ? selected.label : placeholder}
          value={query}
          disabled={disabled || loading}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => !loading && setOpen(true)}
        />
        {loading && (
          <span className="pr-3 flex items-center">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </span>
        )}
        {selected && !disabled && !loading && (
          <button type="button" onClick={() => { onChange(null); setQuery(""); }} className="pr-3 text-muted hover:text-foreground text-lg leading-none">×</button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded-md bg-background border border-border shadow-lg">
          {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-muted">Nenhum resultado.</p> : filtered.map((option) => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); setQuery(""); }}
              className={["w-full text-left px-3 py-2 text-sm transition-colors", option.value === value ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300" : "text-foreground hover:bg-surface"].join(" ")}>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
