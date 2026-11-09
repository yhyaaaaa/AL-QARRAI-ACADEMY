import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 44" className={cn("h-9 w-8", className)} aria-hidden="true">
      <path d="M3 44 V20 A17 17 0 0 1 37 20 V44" fill="none" stroke="#C5A36B" strokeWidth="3" />
      <path d="M10 44 V22 A10 10 0 0 1 30 22 V44" fill="#142337" />
      <circle cx="20" cy="24" r="3.2" fill="#C5A36B" />
      <path d="M14 36 h12" stroke="#F4EBDD" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ to = "/", light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Qarrai Academy home">
      <LogoMark />
      <span className="leading-none">
        <span className={cn("block font-display text-xl", light ? "text-parchment" : "text-ink")}>
          Qarrai
        </span>
        <span
          className={cn(
            "block text-[10px] font-semibold uppercase tracking-[0.28em]",
            light ? "text-gold" : "text-gold-deep",
          )}
        >
          Academy
        </span>
      </span>
    </Link>
  );
}
