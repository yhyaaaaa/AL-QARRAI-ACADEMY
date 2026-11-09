import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink/10 bg-paper shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-ink/15 bg-paper px-3.5 text-sm text-ink placeholder:text-slate-deep/70 focus:border-teal-deep focus:outline-none focus:ring-2 focus:ring-teal/25",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none rounded-xl border border-ink/15 bg-paper px-3.5 py-3 text-sm text-ink placeholder:text-slate-deep/70 focus:border-teal-deep focus:outline-none focus:ring-2 focus:ring-teal/25",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />
  );
}

type Tone = "neutral" | "teal" | "terracotta" | "gold" | "ink" | "mentor";
const TONES: Record<Tone, string> = {
  neutral: "bg-ink/5 text-slate-deep",
  teal: "bg-teal/15 text-teal-deep",
  terracotta: "bg-terracotta/15 text-terracotta-deep",
  gold: "bg-gold/20 text-gold-deep",
  ink: "bg-ink text-parchment",
  mentor: "bg-[var(--mentor-soft)] text-[var(--mentor-deep)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  className,
  color,
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-ink/8", className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${v}%`, background: color ?? "var(--color-teal)" }}
      />
    </div>
  );
}

export function Alert({
  tone = "gold",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "gold" | "terracotta" | "teal" }) {
  const tones = {
    gold: "border-gold/50 bg-gold/10 text-ink",
    terracotta: "border-terracotta/50 bg-terracotta/10 text-ink",
    teal: "border-teal/50 bg-teal/10 text-ink",
  };
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
