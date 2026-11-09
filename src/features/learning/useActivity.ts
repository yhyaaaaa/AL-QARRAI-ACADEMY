import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { learn } from "@/services/learn";
import { effectiveReplyLanguage, usePrefs } from "@/store/prefsStore";
import { useErrorMessage } from "@/i18n/strings";
import type { MentorId } from "@/types";
import type { ActivityKind, LearningItem } from "@/types/learning";

/**
 * One activity of a given kind for a mentor: open from ?item=<id>, or generate a new one
 * from the current topic. Keeps a list of earlier items of the same kind.
 */
export function useActivity<K extends ActivityKind>(mentorId: MentorId, kind: K) {
  const [params, setParams] = useSearchParams();
  const itemId = params.get("item");
  const replyLanguage = usePrefs((s) => effectiveReplyLanguage(s));
  const errorMessage = useErrorMessage();

  const [item, setItem] = useState<LearningItem<K> | null>(null);
  const [history, setHistory] = useState<LearningItem[]>([]);
  const [pending, setPending] = useState(false);
  const [loadingItem, setLoadingItem] = useState(Boolean(itemId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    learn
      .items({ mentorId, kind, limit: 10 })
      .then((h) => !cancelled && setHistory(h))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mentorId, kind, item?.id]);

  useEffect(() => {
    if (!itemId || item?.id === itemId) return;
    let cancelled = false;
    learn
      .item(itemId)
      .then((i) => {
        if (cancelled) return;
        if (i.mentor_id !== mentorId || (i.kind !== kind && !(kind === "quiz" && i.kind === "diagnostic"))) {
          setError("This activity belongs to another mentor or module.");
        } else setItem(i as LearningItem<K>);
      })
      .catch((e: unknown) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoadingItem(false));
    return () => {
      cancelled = true;
    };
  }, [itemId, item?.id, mentorId, kind, errorMessage]);

  const generate = useCallback(
    async (topic: string, options: LearningItem["options"] = {}) => {
      setPending(true);
      setError(null);
      try {
        const { item: created } = await learn.generate({ mentorId, kind, topic, language: replyLanguage, options });
        setItem(created as LearningItem<K>);
        setParams({ item: created.id }, { replace: false });
        return created as LearningItem<K>;
      } catch (e) {
        setError(errorMessage(e));
        return null;
      } finally {
        setPending(false);
      }
    },
    [mentorId, kind, replyLanguage, setParams, errorMessage],
  );

  const reset = useCallback(() => {
    setItem(null);
    setError(null);
    setParams({});
  }, [setParams]);

  return { item, history, pending, loadingItem, error, generate, reset, setError };
}
