/**
 * Child-safety and prompt-injection screening (deterministic, runs BEFORE any model call).
 *
 *  - redactPersonalData: removes emails / phone numbers / long ID-like numbers so a child's
 *    personal data is neither stored nor sent to the external AI provider.
 *  - detectInjection: known instruction-override / prompt-extraction patterns (EN / FR / AR).
 *  - detectWellbeingConcern: self-harm or abuse disclosures → supportive, human-first reply.
 *
 * These are defence-in-depth heuristics, not guarantees: the system prompt, delimiting of
 * untrusted content and the validator model are further layers.
 */

export interface RedactionResult {
  text: string;
  redacted: boolean;
  kinds: string[];
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// phone-like: optional +, 8–15 digits with common separators
const PHONE = /(?<![\w.])\+?\d[\d\s().-]{7,18}\d(?![\w.])/g;

export function redactPersonalData(input: string): RedactionResult {
  const kinds = new Set<string>();
  let text = input.replace(EMAIL, () => {
    kinds.add("email");
    return "[email removed]";
  });
  text = text.replace(PHONE, (m) => {
    const digits = m.replace(/\D/g, "");
    // keep ordinary maths like "3.14159265" or "1 000 000"? only redact 8–15 digit runs with no operators
    if (digits.length < 8 || digits.length > 15 || /[=×*/^]/.test(m)) return m;
    kinds.add("phone");
    return "[number removed]";
  });
  return { text, redacted: kinds.size > 0, kinds: [...kinds] };
}

const INJECTION_PATTERNS: [string, RegExp][] = [
  [
    "override",
    /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|all|your|the)\b[^.\n]{0,20}\b(instructions?|rules?|prompts?|guidelines?)\b/i,
  ],
  [
    "extraction",
    /\b(reveal|show|print|repeat|tell me|what (is|are))\b[^.\n]{0,30}\b(system|hidden|initial|original)\s+(prompt|instructions?|message|rules)\b/i,
  ],
  [
    "role",
    /\b(you are now|from now on you are|act as|pretend (to be|you are)|roleplay as)\b[^.\n]{0,40}\b(dan|jailbreak|unfiltered|uncensored|evil|developer mode|no rules|without (rules|restrictions|filters))\b/i,
  ],
  ["jailbreak", /\b(jailbreak|developer mode|dan mode|do anything now)\b/i],
  ["delimiter", /<\/?\s*(system|material|instructions?)\s*>|\[\s*system\s*\]|###\s*system/i],
  [
    "override_fr",
    /\b(ignore|oublie|ne tiens pas compte)\b[^.\n]{0,40}\b(instructions|consignes|règles)\b/i,
  ],
  ["override_ar", /(تجاهل|انس|اِنسَ)[^.\n]{0,30}(التعليمات|الأوامر|القواعد)/],
  ["extraction_ar", /(اكشف|أظهر|اعرض)[^.\n]{0,30}(تعليمات النظام|الأوامر المخفية)/],
];

export function detectInjection(text: string): string[] {
  return INJECTION_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

const WELLBEING_PATTERNS: [string, RegExp][] = [
  [
    "self_harm",
    /\b(kill myself|want to die|suicide|suicidal|hurt myself|self[- ]harm|cut myself|end my life)\b/i,
  ],
  ["self_harm_fr", /\b(me suicider|me tuer|envie de mourir|me faire du mal|me scarifier)\b/i],
  ["self_harm_ar", /(أنتحر|انتحار|أريد أن أموت|أؤذي نفسي)/],
  [
    "abuse",
    /\b(someone (hits|touches|hurts) me|being abused|he touches me|she touches me|abuse me)\b/i,
  ],
  ["abuse_fr", /\b(on me frappe|il me touche|elle me touche|on me fait du mal)\b/i],
  ["abuse_ar", /(يضربني|يتحرش بي|يؤذيني)/],
];

export function detectWellbeingConcern(text: string): string[] {
  return WELLBEING_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) =>
    name.replace(/_(fr|ar)$/, ""),
  );
}

export const WELLBEING_REPLY: Record<"en" | "fr" | "ar", string> = {
  en: "I'm really glad you told me. What you're feeling matters, and you deserve help from a real person right now. Please talk to a trusted adult today: a parent, a teacher, a school counsellor or a doctor. If you are in danger or might hurt yourself, call your local emergency number straight away. I'm an AI learning mentor, so I can't give you the support you deserve, but people around you can, and you are not alone.",
  fr: "Merci de me l'avoir dit. Ce que tu ressens compte, et tu mérites l'aide d'une vraie personne dès maintenant. Parle aujourd'hui à un adulte de confiance : un parent, un enseignant, l'infirmière scolaire ou un médecin. Si tu es en danger ou si tu risques de te faire du mal, appelle tout de suite le numéro d'urgence de ton pays. Je suis un mentor IA pour apprendre : je ne peux pas t'apporter le soutien que tu mérites, mais les personnes autour de toi le peuvent. Tu n'es pas seul.",
  ar: "شكرًا لأنك أخبرتني. ما تشعر به مهم، وتستحق مساعدة من شخص حقيقي الآن. تحدّث اليوم مع شخص بالغ تثق به: أحد والديك أو معلّم أو مرشد المدرسة أو طبيب. إذا كنت في خطر أو قد تؤذي نفسك، فاتصل فورًا برقم الطوارئ في بلدك. أنا مرشد تعلّم ذكي، ولا أستطيع تقديم الدعم الذي تستحقه، لكن من حولك يستطيعون. لست وحدك.",
};

export const INJECTION_REPLY: Record<"en" | "fr" | "ar", string> = {
  en: "I can't change how I work or share my instructions, but I'd love to help you learn! What topic shall we explore?",
  fr: "Je ne peux pas changer ma façon de fonctionner ni partager mes instructions, mais je serais ravi de t'aider à apprendre ! Quel sujet veux-tu explorer ?",
  ar: "لا أستطيع تغيير طريقة عملي أو مشاركة تعليماتي، لكن يسعدني أن أساعدك على التعلّم! ما الموضوع الذي تريد استكشافه؟",
};

/** Output-side check: did the model leak its system prompt? */
const LEAK_MARKERS = [
  "teaching methodology:",
  "communication style:",
  "learning behaviour:",
  "you are a mentor at qarrai academy",
  "safety rules (highest priority)",
];
export function detectPromptLeak(output: string): boolean {
  const o = output.toLowerCase();
  return LEAK_MARKERS.filter((m) => o.includes(m)).length >= 1;
}
