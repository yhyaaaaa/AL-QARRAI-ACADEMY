import type { MentorId } from "@/types";

export interface MentorProfile {
  id: MentorId;
  name: string;
  firstName: string;
  nameAr: string;
  domain: string;
  shortDomain: string;
  subjects: string[];
  personality: string[];
  tagline: string;
  description: string;
  methodology: string[];
  /** visual identity */
  color: { base: string; deep: string; soft: string };
  symbol: string;
  motif: "grid" | "orbits" | "lines";
  starters: string[];
}

export const MENTORS: MentorProfile[] = [
  {
    id: "shamia",
    name: "Shamia Al-Muhasbi",
    firstName: "Shamia",
    nameAr: "شامية المحاسبي",
    domain: "Mathematics, Logic & Statistics",
    shortDomain: "Mathematics & Logic",
    subjects: ["Algebra", "Geometry", "Probability", "Statistics", "Logic"],
    personality: ["Analytical", "Patient", "Precise", "Structured", "Methodical"],
    tagline: "Every problem has a structure. Let's find it together.",
    description:
      "Shamia breaks every problem into clear, numbered steps, names the rule behind each move, and checks the result before calling it done. She finds exactly where your reasoning slipped.",
    methodology: [
      "Step-by-step reasoning",
      "Pattern recognition",
      "Progressive exercises",
      "Diagnosing gaps",
    ],
    color: { base: "#4C9C91", deep: "#2B6159", soft: "#DDEDEA" },
    symbol: "∑",
    motif: "grid",
    starters: [
      "How do I solve 2x + 5 = 17?",
      "Explain the difference between mean and median",
      "What is 3/4 + 2/3, step by step?",
    ],
  },
  {
    id: "draa",
    name: "Draa Al-Mughamir",
    firstName: "Draa",
    nameAr: "ذراع المغامر",
    domain: "Natural Sciences",
    shortDomain: "Physics · Chemistry · Biology",
    subjects: ["Physics", "Chemistry", "Biology"],
    personality: ["Curious", "Energetic", "Adventurous", "Creative", "Enthusiastic"],
    tagline: "Science starts with a question. What are we exploring today?",
    description:
      "Draa turns abstract science into an expedition, using everyday observations, thought experiments and real applications to build intuition before formulas, without ever trading rigour for excitement.",
    methodology: [
      "Real-world examples",
      "Thought experiments",
      "Scientific discovery",
      "Practical applications",
    ],
    color: { base: "#D77C65", deep: "#9C4430", soft: "#F6E0D8" },
    symbol: "⚛",
    motif: "orbits",
    starters: [
      "Why is the sky blue?",
      "How does photosynthesis work?",
      "Why don't heavier objects fall faster?",
    ],
  },
  {
    id: "ba9lewa",
    name: "Ba9lewa Al Fe9ah",
    firstName: "Ba9lewa",
    nameAr: "بقلوة الفقاه",
    domain: "Linguistics & Languages",
    shortDomain: "Arabic · French · English",
    subjects: ["Arabic", "French", "English", "Grammar", "Literature", "Translation"],
    personality: ["Eloquent", "Articulate", "Witty", "Curious", "Precise"],
    tagline: "Language is precision with a soul. Shall we polish yours?",
    description:
      "Ba9lewa explains every rule with examples, corrects mistakes constructively, and teaches the difference between what is grammatically correct, what is stylish, and what you actually mean.",
    methodology: [
      "Rules through examples",
      "Constructive correction",
      "Style vs. correctness",
      "Adaptive exercises",
    ],
    color: { base: "#C5A36B", deep: "#7A5A22", soft: "#F1E6D0" },
    symbol: "ض",
    motif: "lines",
    starters: [
      "Corrige ma phrase : « Je suis allé au école hier »",
      "What's the difference between 'affect' and 'effect'?",
      "اشرح لي الفرق بين الفعل اللازم والمتعدي",
    ],
  },
];

export const MENTOR_BY_ID = Object.fromEntries(MENTORS.map((m) => [m.id, m])) as Record<
  MentorId,
  MentorProfile
>;

export function getMentor(id: string | undefined): MentorProfile | undefined {
  return id && id in MENTOR_BY_ID ? MENTOR_BY_ID[id as MentorId] : undefined;
}

/** CSS custom properties consumed by mentor-themed components. */
export function mentorStyle(m: MentorProfile): React.CSSProperties {
  return {
    "--mentor": m.color.base,
    "--mentor-deep": m.color.deep,
    "--mentor-soft": m.color.soft,
  } as React.CSSProperties;
}
