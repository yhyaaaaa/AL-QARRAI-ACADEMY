/**
 * Learning experiences: generation and checking go through the mentor-response Edge Function
 * (validated by the shared engine, answers kept server-side); history and stats are RLS reads.
 */
import { callFunction } from "./api";
import { requireSupabase } from "./supabase/client";
import type { Language, MentorId } from "@/types";
import type {
  ActivityKind,
  AttemptRow,
  CheckResult,
  LearningItem,
  LearningStats,
  TeachBackEvaluation,
} from "@/types/learning";

const ITEM_COLUMNS = "id, mentor_id, subject_id, kind, topic, language, options, content, meta, created_at";

export const learn = {
  generate<K extends ActivityKind>(req: {
    mentorId: MentorId;
    kind: K;
    topic: string;
    language: Language;
    options?: LearningItem["options"];
    documentId?: string;
  }) {
    return callFunction<{ item: LearningItem<K> }>("mentor-response", { action: "generate", ...req });
  },

  check(itemId: string, part: number, answer: string | number | boolean | number[], hintUsed = false) {
    return callFunction<CheckResult>("mentor-response", { action: "check", itemId, part, answer, hintUsed });
  },

  teachBack(itemId: string, explanation: string) {
    return callFunction<{ evaluation: TeachBackEvaluation; points: number; attempt: number }>("mentor-response", {
      action: "check",
      itemId,
      part: 0,
      answer: explanation,
    });
  },

  async items(filter: { mentorId?: MentorId; kind?: ActivityKind; limit?: number } = {}): Promise<LearningItem[]> {
    const sb = requireSupabase();
    let q = sb.from("learning_items").select(ITEM_COLUMNS).order("created_at", { ascending: false }).limit(filter.limit ?? 20);
    if (filter.mentorId) q = q.eq("mentor_id", filter.mentorId);
    if (filter.kind) q = q.eq("kind", filter.kind);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data as LearningItem[];
  },

  async item(id: string): Promise<LearningItem> {
    const sb = requireSupabase();
    const { data, error } = await sb.from("learning_items").select(ITEM_COLUMNS).eq("id", id).single();
    if (error) throw new Error(error.message);
    return data as LearningItem;
  },

  async attempts(itemId: string): Promise<AttemptRow[]> {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("activity_attempts")
      .select("id, item_id, part, answer, is_correct, score, points, feedback, created_at")
      .eq("item_id", itemId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return data as AttemptRow[];
  },

  async flashcardReviews(itemId: string): Promise<Record<number, "known" | "practice">> {
    const sb = requireSupabase();
    const { data, error } = await sb.from("flashcard_reviews").select("card_index, status").eq("item_id", itemId);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((r) => [r.card_index, r.status]));
  },

  async reviewFlashcard(itemId: string, cardIndex: number, status: "known" | "practice") {
    const sb = requireSupabase();
    const { error } = await sb
      .from("flashcard_reviews")
      .upsert({ item_id: itemId, card_index: cardIndex, status, reviewed_at: new Date().toISOString() }, {
        onConflict: "user_id,item_id,card_index",
      });
    if (error) throw new Error(error.message);
  },

  async stats(): Promise<LearningStats> {
    const sb = requireSupabase();
    const { data, error } = await sb.rpc("get_learning_stats");
    if (error) throw new Error(error.message);
    return data as LearningStats;
  },
};
