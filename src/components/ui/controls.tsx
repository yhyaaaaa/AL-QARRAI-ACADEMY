import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accessible on/off switch with a visible description. */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="text-sm text-slate-deep">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-teal-deep bg-teal-deep" : "border-slate-deep bg-paper",
        )}
        data-testid={testId}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full transition-all",
            checked ? "bg-white start-[1.375rem]" : "bg-slate-deep start-0.5",
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

/** Multi-select chips (checkbox semantics). */
export function ChipGroup<T extends string>({
  label,
  help,
  options,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <fieldset>
      <legend className="font-medium">{label}</legend>
      {help && <p className="text-sm text-slate-deep">{help}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-medium",
                on ? "border-teal-deep bg-teal/10" : "border-ink/15 bg-paper hover:border-ink/40",
              )}
            >
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-teal-deep)]"
                checked={on}
                onChange={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Single choice as large radio cards. */
export function RadioCards<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; description?: ReactNode }[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="font-medium">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-12 cursor-pointer flex-col justify-center rounded-2xl border-2 px-4 py-3",
              value === o.value ? "border-teal-deep bg-teal/10" : "border-ink/15 bg-paper hover:border-ink/40",
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                name={name}
                className="size-4 accent-[var(--color-teal-deep)]"
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </span>
            {o.description && <span className="mt-1 text-sm text-slate-deep">{o.description}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
