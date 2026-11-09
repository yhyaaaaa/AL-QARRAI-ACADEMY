import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/navigation/Logo";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper-grain px-4 text-center">
      <LogoMark className="h-16 w-14" />
      <h1 className="font-display text-4xl">This corridor leads nowhere</h1>
      <p className="text-slate-deep">The page you're looking for isn't part of the academy.</p>
      <Button asChild>
        <Link to="/">Back to the entrance</Link>
      </Button>
    </div>
  );
}
