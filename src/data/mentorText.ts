import type { MentorId } from "@/types";
import { usePrefs, type UiLanguage } from "@/store/prefsStore";
import type { MentorProfile } from "./mentors";

type MentorText = Pick<
  MentorProfile,
  "character" | "domain" | "shortDomain" | "subjects" | "personality" | "tagline" | "description" | "methodology" | "topics"
>;

/**
 * Display text for each mentor in French and Arabic (Tunisian Darija reuses the Arabic, which
 * every Tunisian learner reads at school). English lives in mentors.ts.
 * Note: written for the MVP; should be reviewed by native speakers.
 */
const TEXT: Record<"fr" | "ar", Record<MentorId, MentorText>> = {
  fr: {
    ba9lewa: {
      character: "une baklava joyeuse avec des lunettes rondes, une règle et un crayon",
      domain: "Mathématiques, logique et statistiques",
      shortDomain: "Maths et logique",
      subjects: ["Algèbre", "Géométrie", "Probabilités", "Statistiques", "Logique"],
      personality: ["Analytique", "Patiente", "Précise", "Méthodique", "Structurée"],
      tagline: "Chaque problème a des couches. On les traverse une par une.",
      description:
        "Ba9lewa découpe les problèmes difficiles en petites étapes, explique pourquoi chaque formule marche et t'aide à repérer exactement où une solution s'est trompée, pour comprendre l'idée au lieu d'apprendre la réponse par cœur.",
      methodology: ["Des étapes petites et claires", "La raison derrière chaque formule", "Un entraînement progressif", "Repérer les malentendus"],
      topics: ["Fractions", "Équations du premier degré", "Pourcentages", "Théorème de Pythagore", "Bases des probabilités", "Moyenne, médiane et mode"],
    },
    ibnbatbuta: {
      character: "un explorateur en pain batbout avec des lunettes d'aviateur, une casquette rouge et une écharpe bleue",
      domain: "Sciences de la nature",
      shortDomain: "Physique, chimie et biologie",
      subjects: ["Physique", "Chimie", "Biologie"],
      personality: ["Curieux", "Énergique", "Aventurier", "Créatif", "Enthousiaste"],
      tagline: "Chaque question est une expédition. Où partons-nous aujourd'hui ?",
      description:
        "Ibn Batbuta explore les sciences comme un voyageur : il part de ce que tu vois tous les jours, fait des expériences de pensée et relie chaque idée au fonctionnement réel du monde.",
      methodology: ["Des exemples du quotidien", "Des expériences de pensée", "La découverte scientifique", "Des applications concrètes"],
      topics: ["La photosynthèse", "Le cycle de l'eau", "Les états de la matière", "Les lois de Newton", "Le cœur humain", "Acides et bases"],
    },
    falfoul: {
      character: "un ourson en gomme rouge savant avec des lunettes dorées, un nœud papillon et un parchemin",
      domain: "Linguistique et langues",
      shortDomain: "Arabe, français et anglais",
      subjects: ["Arabe", "Français", "Anglais", "Grammaire", "Vocabulaire", "Littérature", "Écriture", "Traduction"],
      personality: ["Éloquent", "Clair", "Plein d'esprit", "Curieux", "Précis"],
      tagline: "Les mots sont des outils et des trésors. Utilisons-les bien.",
      description:
        "Falfoul enseigne la langue par l'exemple, corrige les erreurs avec gentillesse et t'aide à dire ce que tu penses, en montrant la différence entre ce qui est correct, élégant et clair.",
      methodology: ["Les règles par l'exemple", "Des corrections bienveillantes", "Correction, style et sens", "Écrire avec tes propres mots"],
      topics: ["Le présent en français", "Les formes verbales en arabe", "Les verbes irréguliers anglais", "Écrire un bon paragraphe", "Les figures de style", "La ponctuation"],
    },
  },
  ar: {
    ba9lewa: {
      character: "بقلاوة مرحة بنظارات مستديرة ومسطرة وقلم",
      domain: "الرياضيات والمنطق والإحصاء",
      shortDomain: "رياضيات ومنطق",
      subjects: ["الجبر", "الهندسة", "الاحتمالات", "الإحصاء", "المنطق"],
      personality: ["تحليلية", "صبورة", "دقيقة", "منهجية", "منظّمة"],
      tagline: "لكل مسألة طبقات، وسنمرّ بها واحدة تلو الأخرى.",
      description:
        "تقسّم بقلوة المسائل الصعبة إلى خطوات صغيرة، وتشرح لماذا تعمل كل قاعدة، وتساعدك على اكتشاف موضع الخطأ في الحل بالضبط، لتفهم الفكرة بدل حفظ الجواب.",
      methodology: ["خطوات صغيرة وواضحة", "السبب وراء كل قاعدة", "تدرّب متدرّج", "اكتشاف سوء الفهم"],
      topics: ["الكسور", "المعادلات من الدرجة الأولى", "النسب المئوية", "مبرهنة فيثاغورس", "أساسيات الاحتمالات", "المتوسط والوسيط والمنوال"],
    },
    ibnbatbuta: {
      character: "مستكشف من خبز البطبوط بنظارات طيران وقبعة حمراء ووشاح أزرق",
      domain: "علوم الطبيعة",
      shortDomain: "فيزياء وكيمياء وأحياء",
      subjects: ["الفيزياء", "الكيمياء", "الأحياء"],
      personality: ["فضولي", "نشيط", "مغامر", "مبدع", "متحمّس"],
      tagline: "كل سؤال رحلة استكشاف. إلى أين نسافر اليوم؟",
      description:
        "يستكشف ابن بطبوطة العلوم كالرحّالة: ينطلق مما تراه كل يوم، ويجري تجارب ذهنية، ويربط كل فكرة بطريقة عمل العالم الحقيقي.",
      methodology: ["أمثلة من الحياة اليومية", "تجارب ذهنية", "الاكتشاف العلمي", "تطبيقات عملية"],
      topics: ["التمثيل الضوئي", "دورة الماء", "حالات المادة", "قوانين نيوتن", "قلب الإنسان", "الأحماض والقواعد"],
    },
    falfoul: {
      character: "دبدوب حلوى أحمر عالِم بنظارات ذهبية وربطة عنق فراشة ولفافة",
      domain: "اللسانيات واللغات",
      shortDomain: "عربية وفرنسية وإنجليزية",
      subjects: ["العربية", "الفرنسية", "الإنجليزية", "النحو", "المفردات", "الأدب", "الكتابة", "الترجمة"],
      personality: ["فصيح", "واضح", "ظريف", "فضولي", "دقيق"],
      tagline: "الكلمات أدوات وكنوز، فلنحسن استعمالها.",
      description:
        "يعلّم فلفول اللغة بالأمثلة، ويصحّح الأخطاء بلطف، ويساعدك على قول ما تقصده، مبيّنًا الفرق بين الصحيح والجميل والواضح.",
      methodology: ["القواعد بالأمثلة", "تصحيح لطيف", "الصحة والأسلوب والمعنى", "الكتابة بكلماتك"],
      topics: ["المضارع في الفرنسية", "أوزان الأفعال في العربية", "الأفعال الشاذة في الإنجليزية", "كتابة فقرة جيدة", "الصور البلاغية", "علامات الترقيم"],
    },
  },
};

export function localizeMentor(m: MentorProfile, lang: UiLanguage): MentorProfile {
  const key = lang === "tn" ? "ar" : lang;
  if (key === "en") return m;
  return { ...m, ...TEXT[key][m.id] };
}

/** The mentor with its display text in the current interface language. */
export function useLocalizedMentor(m: MentorProfile): MentorProfile {
  const lang = usePrefs((s) => s.uiLanguage);
  return localizeMentor(m, lang);
}

/** Localiser bound to the current interface language, for lists of mentors. */
export function useMentorLocalizer(): (m: MentorProfile) => MentorProfile {
  const lang = usePrefs((s) => s.uiLanguage);
  return (m) => localizeMentor(m, lang);
}
