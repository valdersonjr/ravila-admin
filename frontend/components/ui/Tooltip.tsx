"use client";
import { useState } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {visible && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-56 rounded-lg bg-neutral-800 text-white text-xs p-3 shadow-lg">
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full border-4 border-transparent border-b-neutral-800" />
          {content}
        </span>
      )}
    </span>
  );
}
