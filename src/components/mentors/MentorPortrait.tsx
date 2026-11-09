import { useEffect } from "react";
import { useT } from "@/i18n/strings";
import { useLocalizedMentor } from "@/data/mentorText";
import { AnimatePresence, motion } from "motion/react";
import type { MentorProfile, MentorState } from "@/data/mentors";
import { cn } from "@/lib/utils";


const preloaded = new Set<string>();
function preload(mentor: MentorProfile) {
  for (const src of Object.values(mentor.art)) {
    if (preloaded.has(src)) continue;
    preloaded.add(src);
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

/**
 * The mentor character in one of its four states, standing in the academy's arch.
 * States crossfade (instant under reduced motion); all states are preloaded.
 */
export function MentorCharacter({
  mentor,
  state = "idle",
  className,
  frame = true,
  decorative = false,
}: {
  mentor: MentorProfile;
  state?: MentorState;
  className?: string;
  /** draw the arch alcove behind the character */
  frame?: boolean;
  /** hide from assistive tech when the name is already announced next to it */
  decorative?: boolean;
}) {
  useEffect(() => preload(mentor), [mentor]);
  const character = useLocalizedMentor(mentor).character;
  const t = useT();
  const alt = `${mentor.name}, ${character}, ${t(`state.${state}`)}`;

  return (
    <div
      className={cn("relative isolate aspect-[5/6] w-full", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative || undefined}
      data-testid={`character-${mentor.id}`}
      data-state={state}
    >
      {frame && (
        <div
          className={cn("absolute inset-x-[6%] bottom-0 top-[4%] -z-10 rounded-t-full", `motif-${mentor.motif}`)}
          style={{ background: mentor.color.soft, ["--mentor" as string]: mentor.color.base }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-t-full border-[3px]" style={{ borderColor: mentor.color.base }} />
        </div>
      )}
      <AnimatePresence initial={false} mode="popLayout">
        <motion.img
          key={state}
          src={mentor.art[state]}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-contain object-bottom"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        />
      </AnimatePresence>
    </div>
  );
}

/** Small circular avatar (face crop of the idle state). */
export function MentorAvatar({
  mentor,
  size = 40,
  className,
}: {
  mentor: MentorProfile;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block shrink-0 overflow-hidden rounded-full border-2", className)}
      style={{ width: size, height: size, background: mentor.color.soft, borderColor: mentor.color.base }}
      aria-hidden="true"
    >
      <img
        src={mentor.art.idle}
        alt=""
        className="h-full w-full scale-[1.55] object-cover"
        style={{ objectPosition: "50% 22%" }}
        draggable={false}
      />
    </span>
  );
}

/** Backwards-compatible name used by existing pages. */
export function MentorPortrait({
  mentor,
  className,
}: {
  mentor: MentorProfile;
  className?: string;
  showMedallion?: boolean;
}) {
  return <MentorCharacter mentor={mentor} className={className} />;
}
