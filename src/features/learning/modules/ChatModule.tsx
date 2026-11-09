import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalizedMentor } from "@/data/mentorText";
import { Link, useSearchParams } from "react-router-dom";
import { CircleHelp, MessageSquarePlus, MessagesSquare } from "lucide-react";
import type { MentorProfile } from "@/data/mentors";
import { MessageBubble, TypingIndicator } from "@/components/chat/MessageBubble";
import { Composer } from "@/components/chat/Composer";
import { useAuth } from "@/store/authStore";
import { effectiveReplyLanguage, usePrefs } from "@/store/prefsStore";
import { api } from "@/services/api";
import { data } from "@/services/data";
import { uploadDocument } from "@/services/documents";
import { useErrorMessage, useT } from "@/i18n/strings";
import type { DocumentRow, ExerciseView, MessageRow, SessionSummary } from "@/types";
import type { Experience } from "../experiences";
import { useCharacterState } from "../hooks";
import { ErrorState, ModuleShell } from "../ui";
import { formatRelative } from "@/utils/format";
import { cn } from "@/lib/utils";

/** Chat & Explain (mode "explain") and Ask Why (mode "askwhy") — the same validated pipeline. */
export function ChatModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const t = useT();
  const tagline = useLocalizedMentor(mentor).tagline;
  const errorMessage = useErrorMessage();
  const user = useAuth((s) => s.user)!;
  const language = usePrefs((s) => effectiveReplyLanguage(s));
  const mode = experience.id === "askwhy" ? "askwhy" : "explain";
  const [params, setParams] = useSearchParams();
  const sessionId = params.get("session");

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loaded, setLoaded] = useState<{ sid: string | null; messages: MessageRow[] }>({ sid: null, messages: [] });
  const messages = useMemo(() => (loaded.sid === sessionId ? loaded.messages : []), [loaded, sessionId]);
  const [exercises, setExercises] = useState<Record<string, ExerciseView>>({});
  const [pending, setPending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<{ message: string; retryText?: string } | null>(null);
  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const character = useCharacterState({ pending, typing });
  const skipLoad = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const reloadSessions = useCallback(
    () =>
      data
        .sessions()
        .then((all) => setSessions(all.filter((s) => s.mentor_id === mentor.id)))
        .catch(() => undefined),
    [mentor.id],
  );
  useEffect(() => {
    void reloadSessions();
  }, [reloadSessions]);

  useEffect(() => {
    if (!sessionId || skipLoad.current === sessionId) return;
    let cancelled = false;
    Promise.all([data.messages(sessionId), data.exercises(sessionId)])
      .then(([msgs, exs]) => {
        if (cancelled) return;
        setLoaded({ sid: sessionId, messages: msgs });
        setExercises(Object.fromEntries(exs.filter((x) => x.message_id).map((x) => [x.message_id!, x])));
      })
      .catch((e: unknown) => !cancelled && setError({ message: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [sessionId, errorMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      setError(null);
      setPending(true);
      try {
        const res = await api.chat({
          mentorId: mentor.id,
          sessionId: sessionId ?? undefined,
          content: text,
          intent: "chat",
          mode,
          language,
          documentId: document?.id,
        });
        const sid = res.session.id;
        if (sid !== sessionId) {
          skipLoad.current = sid;
          setParams({ session: sid }, { replace: true });
        }
        setLoaded((cur) => ({ sid, messages: [...(cur.sid === sid ? cur.messages : []), ...res.messages] }));
        character.answered();
        void reloadSessions();
        return true;
      } catch (e) {
        setError({ message: errorMessage(e), retryText: text });
        return false;
      } finally {
        setPending(false);
      }
    },
    [mentor.id, sessionId, mode, language, document, setParams, reloadSessions, errorMessage, character],
  );

  async function attach(file: File) {
    setDocumentBusy(true);
    setError(null);
    try {
      const { document: doc } = await uploadDocument(file, user.id);
      setDocument(doc);
    } catch (e) {
      setError({ message: errorMessage(e) });
    } finally {
      setDocumentBusy(false);
    }
  }

  const lastBot = [...messages].reverse().find((m) => m.role === "assistant");
  const followUps = !pending && lastBot?.status === "validated" ? (lastBot.meta?.ai?.followUps ?? []) : [];

  const sessionList = (
    <nav aria-label={t("chat.sessions")} className="mt-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("chat.sessions")}</h2>
        <button
          type="button"
          onClick={() => {
            setParams({});
            setDocument(null);
            setError(null);
          }}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium text-[var(--mentor-deep)] hover:bg-ink/5"
          data-testid="new-session"
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" /> {t("chat.newSession")}
        </button>
      </div>
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {sessions.slice(0, 15).map((s) => (
          <li key={s.id}>
            <Link
              to={`?session=${s.id}`}
              className={cn("block rounded-lg px-2.5 py-2 text-sm hover:bg-ink/5", s.id === sessionId && "bg-[var(--mentor-soft)] font-medium")}
              aria-current={s.id === sessionId ? "page" : undefined}
            >
              <span className="line-clamp-1" dir="auto">
                {s.title}
              </span>
              <span className="text-[11px] text-slate-deep">{formatRelative(s.updated_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} aside={sessionList}>
      <div className="flex min-h-[60vh] flex-col rounded-3xl border border-ink/10 bg-paper/70">
        <div
          className={cn("flex-1 space-y-5 overflow-y-auto rounded-t-3xl px-4 py-5 sm:px-6", `motif-${mentor.motif}`)}
          data-testid="message-list"
          aria-live="polite"
        >
          {messages.length === 0 && !pending && (
            <div className="py-6 text-center" data-testid="welcome">
              <p className="font-display text-2xl">{t("space.welcome", { name: mentor.name })}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-deep">
                {mode === "askwhy" ? t("chat.askwhyHint") : tagline}
              </p>
              <div className="mx-auto mt-5 grid max-w-xl gap-2">
                {(mode === "askwhy" ? mentor.whyStarters : mentor.starters)
                  .slice(0, 3)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="min-h-11 cursor-pointer rounded-xl border border-ink/10 bg-paper px-4 py-2 text-start text-sm shadow-sm hover:border-[var(--mentor)] hover:bg-[var(--mentor-soft)]"
                      dir="auto"
                      data-testid="starter"
                    >
                      {mode === "askwhy" ? <CircleHelp className="me-2 inline size-4 text-[var(--mentor-deep)]" aria-hidden="true" /> : <MessagesSquare className="me-2 inline size-4 text-[var(--mentor-deep)]" aria-hidden="true" />}
                      {s}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mentor={mentor}
              exercise={exercises[m.id]}
              onExerciseUpdate={(ex) => setExercises((p) => ({ ...p, [ex.message_id!]: ex }))}
            />
          ))}
          {pending && <TypingIndicator mentor={mentor} stage={t("chat.thinking", { name: mentor.name })} />}
          {followUps.length > 0 && (
            <div className="ps-12" data-testid="follow-ups">
              <p className="mb-2 text-xs font-medium text-slate-deep">{t("chat.followUps")}</p>
              <div className="flex flex-wrap gap-2">
                {followUps.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => void send(f)}
                    className="min-h-9 cursor-pointer rounded-full border border-[var(--mentor)] bg-paper px-3 py-1.5 text-start text-sm hover:bg-[var(--mentor-soft)]"
                    dir="auto"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && (
            <ErrorState message={error.message} onRetry={error.retryText ? () => void send(error.retryText!) : undefined} />
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-ink/10 p-3">
          <Composer
            disabled={pending}
            document={document}
            documentBusy={documentBusy}
            onSend={send}
            onAttach={attach}
            onClearDocument={() => setDocument(null)}
            placeholder={mode === "askwhy" ? t("chat.askwhyHint") : t("chat.placeholder", { name: mentor.name })}
            onTypingChange={setTyping}
          />
        </div>
      </div>
    </ModuleShell>
  );
}
