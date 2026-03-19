import { TextareaHTMLAttributes } from "react";

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={["w-full rounded-md px-3 py-2 text-sm bg-background text-foreground border border-border placeholder:text-muted outline-none focus:ring-2 focus:ring-primary-500 transition-shadow resize-y min-h-24", className].join(" ")}
      {...props}
    />
  );
}
