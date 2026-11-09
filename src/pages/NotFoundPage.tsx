import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/navigation/Logo";
import { useT } from "@/i18n/strings";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper-grain px-4 text-center">
      <LogoMark className="h-16 w-14" />
      <h1 className="font-display text-4xl">{t("nf.title")}</h1>
      <p className="text-slate-deep">{t("nf.body")}</p>
      <Button asChild>
        <Link to="/">{t("nf.back")}</Link>
      </Button>
    </div>
  );
}
