import {
  BookOpenText,
  Brain,
  CircleHelp,
  Gamepad2,
  GraduationCap,
  Layers,
  ListChecks,
  MessagesSquare,
  Network,
  type LucideIcon,
} from "lucide-react";
import type { StringKey } from "@/i18n/strings";

export type ExperienceId = "chat" | "askwhy" | "summary" | "keyterms" | "mindmap" | "quiz" | "flashcards" | "game" | "teachback";
export type ExperienceGroup = "understand" | "practise" | "prove";

export interface Experience {
  id: ExperienceId;
  group: ExperienceGroup;
  icon: LucideIcon;
  /** generated from a topic (vs. a free conversation) */
  needsTopic: boolean;
  name: StringKey;
  desc: StringKey;
}

export const EXPERIENCES: Experience[] = [
  { id: "chat", group: "understand", icon: MessagesSquare, needsTopic: false, name: "exp.chat.name", desc: "exp.chat.desc" },
  { id: "askwhy", group: "understand", icon: CircleHelp, needsTopic: false, name: "exp.askwhy.name", desc: "exp.askwhy.desc" },
  { id: "summary", group: "understand", icon: BookOpenText, needsTopic: true, name: "exp.summary.name", desc: "exp.summary.desc" },
  { id: "keyterms", group: "understand", icon: Brain, needsTopic: true, name: "exp.keyterms.name", desc: "exp.keyterms.desc" },
  { id: "mindmap", group: "understand", icon: Network, needsTopic: true, name: "exp.mindmap.name", desc: "exp.mindmap.desc" },
  { id: "quiz", group: "practise", icon: ListChecks, needsTopic: true, name: "exp.quiz.name", desc: "exp.quiz.desc" },
  { id: "flashcards", group: "practise", icon: Layers, needsTopic: true, name: "exp.flashcards.name", desc: "exp.flashcards.desc" },
  { id: "game", group: "practise", icon: Gamepad2, needsTopic: true, name: "exp.game.name", desc: "exp.game.desc" },
  { id: "teachback", group: "prove", icon: GraduationCap, needsTopic: true, name: "exp.teachback.name", desc: "exp.teachback.desc" },
];

export const GROUP_LABEL: Record<ExperienceGroup, StringKey> = {
  understand: "exp.group.understand",
  practise: "exp.group.practise",
  prove: "exp.group.prove",
};

export function getExperience(id: string | undefined): Experience | undefined {
  return EXPERIENCES.find((e) => e.id === id);
}

/** learning_items.kind → experience route */
export const KIND_TO_EXPERIENCE: Record<string, ExperienceId> = {
  quiz: "quiz",
  diagnostic: "quiz",
  summary: "summary",
  mindmap: "mindmap",
  flashcards: "flashcards",
  keyterms: "keyterms",
  teachback: "teachback",
  game: "game",
};
