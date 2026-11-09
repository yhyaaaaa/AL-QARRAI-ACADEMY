/** Relative time in the interface language (read from <html lang>, set by PrefsEffects). */
export function formatRelative(iso: string, locale?: string): string {
  const lang = locale ?? (typeof document !== "undefined" ? document.documentElement.lang : "") ?? "";
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(lang || undefined, { numeric: "auto" });
  } catch {
    rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  }
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString(lang || undefined);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
