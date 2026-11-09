import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";
import { MENTORS, getMentor, mentorStyle, type MentorProfile } from "@/data/mentors";
import { MentorSidebar } from "@/components/mentors/MentorSidebar";
import { MessageBubble, TypingIndicator } from "@/components/chat/MessageBubble";
import { Composer } from "@/components/chat/Composer";
import { MentorAvatar, MentorPortrait } from "@/components/mentors/MentorPortrait";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { useAuth } from "@/store/authStore";
import { usePrefs } from "@/store/prefsStore";
import { api, ApiError } from "@/services/api";
import { data } from "@/services/data";
import { uploadDocument } from "@/services/documents";
import type { DocumentRow, ExerciseView, Language, MessageRow, SessionSummary } from "@/types";
import { cn } from "@/lib/utils";

const EXERCISE_REQUEST = "Can you give me a practice exercise?";

export function LearningPage() {
  const { mentorId } = useParams();
  const mentor = getMentor(mentorId);
  if (!mentor) return <Navigate to="/mentors" replace />;
  return <LearningSpace key={mentor.id} mentor={mentor} />;
}

function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.retryAfterSeconds && e.code === "RATE_LIMITED") {
      const wait =
        e.retryAfterSeconds >= 120
          ? `${Math.round(e.retryAfterSeconds / 60)} minutes`
          : `${e.retryAfterSeconds} seconds`;
      return `${e.message} (try again in about ${wait})`;
    }
    return e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

function LearningSpace({ mentor }: { mentor: MentorProfile }) {
  const user = useAuth((s) => s.user)!;
  const { tutorLanguage, setTutorLanguage } = usePrefs();
  const [params, setParams] = useSearchParams();
  const sessionId = params.get("session");
  const wantsExercise = params.get("exercise") === "1";

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loaded, setLoaded] = useState<{ sid: string | null; messages: MessageRow[] }>({
    sid: null,
    messages: [],
  });
  const messages = useMemo(
    () => (loaded.sid === sessionId ? loaded.messages : []),
    [loaded, sessionId],
  );
  const [exercises, setExercises] = useState<Record<string, ExerciseView>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null);
  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const skipLoad = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoExerciseDone = useRef(false);
  const retryExercise = useRef<() => void>(() => undefined);

  const reloadSessions = useCallback(
    () =>
      data
        .sessions()
        .then((all) => setSessions(all.filter((s) => s.mentor_id === mentor.id)))
        .catch((e: unknown) => setLoadError(describeError(e))),
    [mentor.id],
  );

  useEffect(() => {
    let cancelled = false;
    data
      .sessions()
      .then((all) => !cancelled && setSessions(all.filter((s) => s.mentor_id === mentor.id)))
      .catch((e: unknown) => !cancelled && setLoadError(describeError(e)));
    return () => {
      cancelled = true;
    };
  }, [mentor.id]);

  // load the selected session's history and exercises from the database
  useEffect(() => {
    if (!sessionId || skipLoad.current === sessionId) return;
    let cancelled = false;
    Promise.all([data.messages(sessionId), data.exercises(sessionId)])
      .then(([msgs, exs]) => {
        if (cancelled) return;
        setLoaded({ sid: sessionId, messages: msgs });
        setExercises(
          Object.fromEntries(exs.filter((x) => x.message_id).map((x) => [x.message_id!, x])),
        );
      })
      .catch((e: unknown) => !cancelled && setLoadError(describeError(e)));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  const send = useCallback(
    async (intent: "chat" | "exercise", text: string): Promise<boolean> => {
      setError(null);
      setPending(
        intent === "exercise"
          ? `${mentor.firstName} is preparing and checking an exercise…`
          : `${mentor.firstName} is thinking and double-checking the answer…`,
      );
      try {
        const res = await api.chat({
          mentorId: mentor.id,
          sessionId: sessionId ?? undefined,
          content: text,
          intent,
          language: tutorLanguage,
          documentId: document?.id,
        });
        const sid = res.session.id;
        if (sid !== sessionId) {
          skipLoad.current = sid;
          setParams({ session: sid }, { replace: true });
        }
        setLoaded((cur) => ({
          sid,
          messages: [...(cur.sid === sid ? cur.messages : []), ...res.messages],
        }));
        if (res.exercise?.message_id) {
          const ex = res.exercise;
          setExercises((prev) => ({ ...prev, [ex.message_id!]: ex }));
        }
        void reloadSessions();
        return true;
      } catch (e) {
        setError({
          message: describeError(e),
          retry: intent === "exercise" ? () => retryExercise.current() : undefined,
        });
        return false;
      } finally {
        setPending(null);
      }
    },
    [mentor, sessionId, tutorLanguage, document, setParams, reloadSessions],
  );

  useEffect(() => {
    retryExercise.current = () => void send("exercise", EXERCISE_REQUEST);
  }, [send]);

  // dashboard deep-link: /learn/:id?exercise=1
  useEffect(() => {
    if (wantsExercise && !autoExerciseDone.current) {
      autoExerciseDone.current = true;
      void send("exercise", EXERCISE_REQUEST);
    }
  }, [wantsExercise, send]);

  async function attach(file: File) {
    setDocumentBusy(true);
    setError(null);
    try {
      const { document: doc } = await uploadDocument(file, user.id);
      setDocument(doc);
    } catch (e) {
      setError({ message: describeError(e) });
    } finally {
      setDocumentBusy(false);
    }
  }

  return (
    <div
      style={mentorStyle(mentor)}
      className="grid min-h-0 flex-1 grid-rows-1 lg:grid-cols-[320px_1fr]"
      data-testid="learning-space"
    >
      <div className="hidden min-h-0 lg:flex lg:flex-col">
        <MentorSidebar
          mentor={mentor}
          sessions={sessions}
          activeSessionId={sessionId}
          onNewSession={() => {
            setParams({});
            setDocument(null);
            setError(null);
          }}
        />
      </div>

      <section className="flex min-h-0 flex-col" aria-label={`Conversation with ${mentor.name}`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 bg-paper/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <p className="font-display text-xl leading-none">{mentor.name}</p>
            <p className="text-xs text-slate-deep">{mentor.shortDomain}</p>
          </div>
          <div className="flex gap-1 lg:hidden" aria-label="Switch mentor">
            {MENTORS.filter((m) => m.id !== mentor.id).map((m) => (
              <Link key={m.id} to={`/learn/${m.id}`} title={`Switch to ${m.firstName}`}>
                <MentorAvatar mentor={m} size={30} />
              </Link>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-deep">
            <ShieldCheck className="size-3.5 text-teal-deep" aria-hidden="true" /> Every answer is
            checked before you see it
          </span>
          <label className="ms-auto flex items-center gap-2 text-xs text-slate-deep">
            Replies in
            <select
              value={tutorLanguage}
              onChange={(e) => setTutorLanguage(e.target.value as Language)}
              className="h-8 cursor-pointer rounded-full border border-ink/15 bg-paper px-2 text-xs text-ink"
            >
              <option value="auto">Same as me</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </label>
        </div>

        <div
          ref={scrollRef}
          className={cn("min-h-0 flex-1 overflow-y-auto", `motif-${mentor.motif}`)}
          data-testid="message-list"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
            {loadError && (
              <Alert tone="terracotta">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-terracotta-deep" />
                <span>{loadError}</span>
              </Alert>
            )}
            {messages.length === 0 && !pending && (
              <Welcome mentor={mentor} onPick={(s) => void send("chat", s)} />
            )}
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                mentor={mentor}
                exercise={exercises[m.id]}
                onExerciseUpdate={(ex) =>
                  setExercises((prev) => ({ ...prev, [ex.message_id!]: ex }))
                }
              />
            ))}
            {pending && <TypingIndicator mentor={mentor} stage={pending} />}
            {error && (
              <Alert tone="terracotta" data-testid="chat-error">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-terracotta-deep" />
                <span className="flex-1">{error.message}</span>
                {error.retry && (
                  <Button size="sm" variant="outline" onClick={error.retry}>
                    <RotateCcw /> Retry
                  </Button>
                )}
              </Alert>
            )}
          </div>
        </div>

        <div className="border-t border-ink/10 bg-parchment/90 px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Composer
              disabled={!!pending}
              document={document}
              documentBusy={documentBusy}
              onSend={(t) => send("chat", t)}
              onExercise={() => void send("exercise", EXERCISE_REQUEST)}
              onAttach={attach}
              onClearDocument={() => setDocument(null)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Welcome({ mentor, onPick }: { mentor: MentorProfile; onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center" data-testid="welcome">
      <div className="w-28 lg:hidden">
        <MentorPortrait mentor={mentor} />
      </div>
      <h2 className="mt-2 font-display text-3xl">Welcome to {mentor.firstName}'s study</h2>
      <p className="mt-2 max-w-md text-sm text-ink/75">{mentor.tagline}</p>
      <div className="mt-6 grid w-full max-w-xl gap-2">
        {mentor.starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="cursor-pointer rounded-xl border border-ink/10 bg-paper px-4 py-3 text-start text-sm shadow-sm transition-colors hover:border-[var(--mentor)] hover:bg-[var(--mentor-soft)]"
            dir="auto"
            data-testid="starter"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
