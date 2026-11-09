# Project skills

Claude Code discovers every `*/SKILL.md` in this folder at session start. Third-party skills were **reviewed before installation** (file list, scripts, network access) and copied verbatim from the commits below, except where noted.

| Skill folder | Source | Commit | Licence | Notes |
| --- | --- | --- | --- | --- |
| `qarrai-frontend-design` | this project | — | project | **Primary.** Qarrai identity, mentors, tokens, states, RTL. Overrides generic advice from the skills below. |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) `skills/frontend-design` | `2c5958ecac` (2026-11-06) | see `LICENSE.txt` | — |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) `.claude/skills/ui-ux-pro-max` | `4f2dbb67e6` (2026-11-08) | MIT | **Modified:** script paths changed from `${CLAUDE_PLUGIN_ROOT}/.claude/skills/...` to `.claude/skills/...` (that variable exists only for plugin installs). Needs Python 3. Local scripts and CSV data only, no network. |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `skills/react-best-practices` | `1a2c79d4e6` (2026-10-27) | MIT (declared in SKILL.md; the repo has no LICENSE file) | — |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `skills/web-design-guidelines` | `1a2c79d4e6` | not declared upstream | Fetches the current rules from `raw.githubusercontent.com/vercel-labs/web-interface-guidelines` when used. |
| `shadcn` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) `skills/shadcn` (official) | `8ab2771552` (2026-11-08) | MIT | Runs `npx shadcn@latest …`; our `components.json` is already present. |
| `emil-design-eng`, `animate`, `choreograph`, `animation-performance`, `gestures`, `review-animations` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | `715c1807e0` (2026-11-09) | MIT | Selected the web animation and design-engineering subset; skipped iOS/Swift/Expo/mobile and library-specific skills. |
| `motion-design` (LottieFiles) | [lottiefiles/motion-design-skill](https://github.com/lottiefiles/motion-design-skill) `skills/motion-design` | `f9a8a041b8` (2026-05-18) | MIT | |

**Updating:** re-run the review (scripts, network calls), copy the new folder, re-apply the ui-ux-pro-max path fix, and update this table.
