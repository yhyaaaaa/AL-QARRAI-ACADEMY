import { useId } from "react";
import type { MentorProfile } from "@/data/mentors";
import { cn } from "@/lib/utils";

/**
 * Consistent illustration system for all mentors:
 * Mediterranean arch frame · subject motif · stylised bust · subject medallion.
 * Pure SVG: crisp at any size, themeable, no binary assets.
 */
export function MentorPortrait({
  mentor,
  className,
  showMedallion = true,
  crop = false,
}: {
  mentor: MentorProfile;
  className?: string;
  showMedallion?: boolean;
  /** head-and-shoulders crop, used for avatars */
  crop?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const { base, deep, soft } = mentor.color;
  const INK = "#142337";
  const SKIN = "#E7C6A1";
  const SKIN_SHADE = "#D9B18A";

  return (
    <svg
      viewBox={crop ? "48 80 104 104" : "0 0 200 250"}
      className={cn("block", className)}
      role={crop ? undefined : "img"}
      aria-hidden={crop ? true : undefined}
      aria-label={crop ? undefined : `Portrait of ${mentor.name}`}
    >
      <defs>
        <clipPath id={`arch-${id}`}>
          <path d="M10 250 V100 A90 90 0 0 1 190 100 V250 Z" />
        </clipPath>
      </defs>

      {/* arch background */}
      <path d="M10 250 V100 A90 90 0 0 1 190 100 V250 Z" fill={soft} />

      <g clipPath={`url(#arch-${id})`}>
        {/* motif */}
        {mentor.motif === "grid" && (
          <g stroke={base} strokeOpacity="0.35" strokeWidth="1">
            {Array.from({ length: 13 }, (_, i) => (
              <line key={`v${i}`} x1={10 + i * 15} y1="0" x2={10 + i * 15} y2="250" />
            ))}
            {Array.from({ length: 17 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={10 + i * 15} x2="200" y2={10 + i * 15} />
            ))}
            {/* golden spiral hint */}
            <path
              d="M150 70 A40 40 0 0 0 110 30 A65 65 0 0 0 45 95"
              fill="none"
              stroke={deep}
              strokeOpacity="0.5"
              strokeWidth="2"
            />
          </g>
        )}
        {mentor.motif === "orbits" && (
          <g fill="none" stroke={base} strokeOpacity="0.5" strokeWidth="1.5">
            <ellipse cx="100" cy="95" rx="85" ry="30" transform="rotate(-25 100 95)" />
            <ellipse cx="100" cy="95" rx="85" ry="30" transform="rotate(25 100 95)" />
            <ellipse cx="100" cy="95" rx="30" ry="85" />
            <circle cx="28" cy="70" r="4" fill={deep} stroke="none" />
            <circle cx="170" cy="60" r="3.5" fill={deep} stroke="none" />
            <circle cx="100" cy="12" r="3" fill={deep} stroke="none" />
          </g>
        )}
        {mentor.motif === "lines" && (
          <g stroke={base} strokeOpacity="0.45">
            {Array.from({ length: 16 }, (_, i) => (
              <line key={i} x1="0" y1={20 + i * 15} x2="200" y2={20 + i * 15} strokeWidth="1" />
            ))}
            <path
              d="M30 60 C60 30 80 80 110 50 S160 40 175 70"
              fill="none"
              stroke={deep}
              strokeOpacity="0.55"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* shoulders */}
        <path d="M32 250 C36 196 66 176 100 176 C134 176 164 196 168 250 Z" fill={deep} />

        {mentor.id === "shamia" && (
          <>
            {/* headscarf */}
            <path
              d="M58 132 C58 88 142 88 142 132 C142 160 136 186 150 214 L50 214 C64 186 58 160 58 132 Z"
              fill={INK}
            />
            <path d="M50 214 C70 200 130 200 150 214 L160 250 L40 250 Z" fill={INK} />
            <rect x="92" y="160" width="16" height="18" fill={SKIN_SHADE} />
            <ellipse cx="100" cy="134" rx="29" ry="33" fill={SKIN} />
            {/* round glasses */}
            <g fill="none" stroke={mentor.color.deep} strokeWidth="2.5">
              <circle cx="88" cy="132" r="9" />
              <circle cx="112" cy="132" r="9" />
              <line x1="97" y1="132" x2="103" y2="132" />
            </g>
            <circle cx="88" cy="132" r="2" fill={INK} />
            <circle cx="112" cy="132" r="2" fill={INK} />
            <path
              d="M91 151 Q100 157 109 151"
              stroke={INK}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* collar accent */}
            <path d="M84 214 L100 232 L116 214" fill="none" stroke={base} strokeWidth="3" />
          </>
        )}

        {mentor.id === "draa" && (
          <>
            <rect x="91" y="160" width="18" height="20" fill={SKIN_SHADE} />
            <ellipse cx="100" cy="132" rx="31" ry="34" fill={SKIN} />
            {/* adventurous hair */}
            <path
              d="M68 124 C64 94 84 86 98 90 C104 78 126 80 130 94 C140 96 138 112 132 122 C126 108 112 104 100 108 C88 104 76 110 68 124 Z"
              fill={INK}
            />
            {/* goggles pushed up */}
            <rect x="68" y="104" width="64" height="9" rx="4" fill={mentor.color.deep} />
            <circle cx="86" cy="108" r="9" fill="#C5A36B" stroke={INK} strokeWidth="2.5" />
            <circle cx="114" cy="108" r="9" fill="#C5A36B" stroke={INK} strokeWidth="2.5" />
            <circle cx="88" cy="135" r="2.5" fill={INK} />
            <circle cx="112" cy="135" r="2.5" fill={INK} />
            <path
              d="M88 150 Q100 161 112 150"
              stroke={INK}
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            {/* explorer scarf */}
            <path
              d="M74 188 C90 200 110 200 126 188 L130 200 C112 214 88 214 70 200 Z"
              fill="#C5A36B"
            />
          </>
        )}

        {mentor.id === "ba9lewa" && (
          <>
            <rect x="91" y="160" width="18" height="20" fill={SKIN_SHADE} />
            <ellipse cx="100" cy="133" rx="30" ry="34" fill={SKIN} />
            {/* neat parted hair */}
            <path
              d="M69 128 C66 96 86 90 100 92 C120 90 136 100 131 128 C126 112 116 104 104 106 L96 100 C88 108 76 112 69 128 Z"
              fill={INK}
            />
            <circle cx="88" cy="134" r="2.5" fill={INK} />
            <circle cx="112" cy="134" r="2.5" fill={INK} />
            {/* moustache + smile */}
            <path
              d="M86 148 Q93 143 100 148 Q107 143 114 148 Q107 152 100 150 Q93 152 86 148 Z"
              fill={INK}
            />
            <path
              d="M93 156 Q100 160 107 156"
              stroke={INK}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* scholar's scarf */}
            <path
              d="M70 186 C88 198 112 198 130 186 L120 236 L108 236 L112 200 C104 204 96 204 88 200 L92 236 L80 236 Z"
              fill={base}
            />
            {/* quill */}
            <path
              d="M150 250 L176 150 C186 168 182 196 160 222"
              fill={soft}
              stroke={INK}
              strokeWidth="2"
            />
            <line x1="150" y1="250" x2="174" y2="160" stroke={INK} strokeWidth="1.5" />
          </>
        )}
      </g>

      {/* frame */}
      <path d="M10 250 V100 A90 90 0 0 1 190 100 V250" fill="none" stroke={deep} strokeWidth="4" />

      {showMedallion && !crop && (
        <g>
          <circle cx="164" cy="214" r="24" fill="#FBF7F0" stroke="#C5A36B" strokeWidth="3" />
          <text
            x="164"
            y="215"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={mentor.symbol === "ض" ? 26 : 24}
            fontFamily={
              mentor.symbol === "ض" ? "IBM Plex Sans Arabic, sans-serif" : "DM Serif Display, serif"
            }
            fill={deep}
          >
            {mentor.symbol}
          </text>
        </g>
      )}
    </svg>
  );
}

/** Small circular avatar (head-and-shoulders crop of the portrait). */
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
      style={{
        width: size,
        height: size,
        background: mentor.color.soft,
        borderColor: mentor.color.base,
      }}
    >
      <MentorPortrait mentor={mentor} crop className="h-full w-full" />
    </span>
  );
}
