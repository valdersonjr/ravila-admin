import { RaviAvatar } from "./RaviAvatar";

interface RaviCardProps {
  message: string;
  sub?: string;
}

export function RaviCard({ message, sub }: RaviCardProps) {
  return (
    <div className="flex items-start gap-3 bg-primary-50 border border-primary-100 rounded-2xl px-4 py-4">
      <div className="shrink-0">
        <RaviAvatar size={40} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-900 leading-snug">{message}</p>
        {sub && <p className="text-xs text-primary-600 mt-1 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}
