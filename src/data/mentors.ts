import type { MentorId } from "@/types";
import ba9lewaIdle from "@/assets/mentors/ba9lewa_idle.webp";
import ba9lewaListening from "@/assets/mentors/ba9lewa_listening.webp";
import ba9lewaTalking from "@/assets/mentors/ba9lewa_talking.webp";
import ba9lewaThinking from "@/assets/mentors/ba9lewa_thinking.webp";
import ibnIdle from "@/assets/mentors/ibnbatbuta_idle.webp";
import ibnListening from "@/assets/mentors/ibnbatbuta_listening.webp";
import ibnTalking from "@/assets/mentors/ibnbatbuta_talking.webp";
import ibnThinking from "@/assets/mentors/ibnbatbuta_thinking.webp";
import falfoulIdle from "@/assets/mentors/falfoul_idle.webp";
import falfoulListening from "@/assets/mentors/falfoul_listening.webp";
import falfoulTalking from "@/assets/mentors/falfoul_talking.webp";
import falfoulThinking from "@/assets/mentors/falfoul_thinking.webp";

/** The four expressive states supplied for every character. */
export type MentorState = "idle" | "listening" | "thinking" | "talking";

export interface MentorProfile {
  id: MentorId;
  name: string;
  nameAr: string;
  /** what the character is (used in alt text) */
  character: string;
  domain: string;
  shortDomain: string;
  subjects: string[];
  personality: string[];
  tagline: string;
  description: string;
  methodology: string[];
  color: { base: string; deep: string; soft: string };
  symbol: string;
  motif: "grid" | "orbits" | "lines";
  art: Record<MentorState, string>;
  /** example chat questions */
  starters: string[];
  /** example Ask-Why questions */
  whyStarters: string[];
  /** example topics for activities (quiz, flashcards, mind map, …) */
  topics: string[];
}

export const MENTORS: MentorProfile[] = [
  {
    id: "ba9lewa",
    name: "Ba9lewa",
    nameAr: "بقلوة",
    character: "a cheerful baklava with round glasses, a ruler and a pencil",
    domain: "Mathematics, Logic & Statistics",
    shortDomain: "Maths & logic",
    subjects: ["Algebra", "Geometry", "Probability", "Statistics", "Logic"],
    personality: ["Analytical", "Patient", "Precise", "Methodical", "Structured"],
    tagline: "Every problem has layers. We'll go through them one at a time.",
    description:
      "Ba9lewa splits hard problems into small steps, explains why each formula works, and helps you spot exactly where a solution went wrong, so you understand the idea instead of memorising the answer.",
    methodology: ["Small, clear steps", "The reason behind each formula", "Progressive practice", "Finding misunderstandings"],
    color: { base: "#C5A36B", deep: "#7A5A22", soft: "#F1E6D0" },
    symbol: "∑",
    motif: "grid",
    art: { idle: ba9lewaIdle, listening: ba9lewaListening, thinking: ba9lewaThinking, talking: ba9lewaTalking },
    starters: ["How do I solve 2x + 5 = 17?", "What is the difference between mean and median?", "Why does a negative times a negative give a positive?"],
    whyStarters: ["Why can't we divide by zero?", "Pourquoi un nombre négatif fois un négatif donne un positif ?", "لماذا مجموع زوايا المثلث 180 درجة؟"],
    topics: ["Fractions", "Linear equations", "Percentages", "Pythagorean theorem", "Probability basics", "Mean, median and mode"],
  },
  {
    id: "ibnbatbuta",
    name: "Ibn Batbuta",
    nameAr: "ابن بطبوطة",
    character: "a round batbout bread explorer with goggles, a red cap and a blue scarf",
    domain: "Natural Sciences",
    shortDomain: "Physics, chemistry & biology",
    subjects: ["Physics", "Chemistry", "Biology"],
    personality: ["Curious", "Energetic", "Adventurous", "Creative", "Enthusiastic"],
    tagline: "Every question is an expedition. Where shall we travel today?",
    description:
      "Ibn Batbuta explores science like a traveller: starting from things you can see every day, running thought experiments, and connecting each idea to how the world really works.",
    methodology: ["Real-world examples", "Thought experiments", "Scientific discovery", "Practical applications"],
    color: { base: "#4C9C91", deep: "#2B6159", soft: "#DDEDEA" },
    symbol: "⚛",
    motif: "orbits",
    art: { idle: ibnIdle, listening: ibnListening, thinking: ibnThinking, talking: ibnTalking },
    starters: ["Why is the sky blue?", "How does photosynthesis work?", "Why don't heavier objects fall faster?"],
    whyStarters: ["Why do ice cubes float?", "Pourquoi le ciel est-il bleu ?", "لماذا نشعر بالبرد عندما نخرج من الماء؟"],
    topics: ["Photosynthesis", "The water cycle", "States of matter", "Newton's laws", "The human heart", "Acids and bases"],
  },
  {
    id: "falfoul",
    name: "Falfoul",
    nameAr: "فلفول",
    character: "a red gummy bear scholar with gold glasses, a bow tie and a scroll",
    domain: "Linguistics & Languages",
    shortDomain: "Arabic, French & English",
    subjects: ["Arabic", "French", "English", "Grammar", "Vocabulary", "Literature", "Writing", "Translation"],
    personality: ["Eloquent", "Articulate", "Witty", "Curious", "Precise"],
    tagline: "Words are tools and treasures. Let's use them well.",
    description:
      "Falfoul teaches language through examples, corrects mistakes kindly, and helps you say what you mean, showing the difference between what is correct, what is elegant and what is clear.",
    methodology: ["Rules through examples", "Kind corrections", "Correctness, style and meaning", "Writing in your own words"],
    color: { base: "#D77C65", deep: "#9C4430", soft: "#F6E0D8" },
    symbol: "ض",
    motif: "lines",
    art: { idle: falfoulIdle, listening: falfoulListening, thinking: falfoulThinking, talking: falfoulTalking },
    starters: ["Corrige ma phrase : « Je suis allé au école hier »", "What's the difference between 'affect' and 'effect'?", "اشرح لي الفرق بين الفعل اللازم والمتعدي"],
    whyStarters: ["Why does English spelling not match pronunciation?", "Pourquoi dit-on « un » arbre mais « une » table ?", "لماذا تُكتب التاء مربوطة أحيانًا ومفتوحة أحيانًا؟"],
    topics: ["French present tense", "Arabic verb forms", "English irregular verbs", "Writing a good paragraph", "Figures of speech", "Punctuation"],
  },
];

export const MENTOR_BY_ID = Object.fromEntries(MENTORS.map((m) => [m.id, m])) as Record<MentorId, MentorProfile>;

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
