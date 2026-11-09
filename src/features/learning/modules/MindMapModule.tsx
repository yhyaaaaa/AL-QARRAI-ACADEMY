import { useMemo, useState } from "react";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MentorProfile } from "@/data/mentors";
import { Card } from "@/components/ui/primitives";
import { useT } from "@/i18n/strings";
import type { LearningItem, MindMapContent } from "@/types/learning";
import { ActivityFrame } from "../ActivityFrame";
import type { Experience } from "../experiences";
import { useCharacterState } from "../hooks";
import { useActivity } from "../useActivity";
import { ModuleShell, ReadAloudButton, Segmented } from "../ui";
import { frameProps } from "../frameProps";

// branch colours from the design tokens (text on them uses the -deep variant)
const BRANCH = [
  { fill: "#DDEDEA", line: "#2B6159" },
  { fill: "#F6E0D8", line: "#9C4430" },
  { fill: "#F1E6D0", line: "#7A5A22" },
  { fill: "#E3E8EE", line: "#4A5B6E" },
  { fill: "#E6E2F0", line: "#2a3a50" },
  { fill: "#EADCC6", line: "#142337" },
];

export function MindMapModule({ mentor, experience }: { mentor: MentorProfile; experience: Experience }) {
  const act = useActivity(mentor.id, "mindmap");
  const character = useCharacterState({ pending: act.pending, typing: false });
  return (
    <ModuleShell mentor={mentor} experience={experience} state={character.state} topic={act.item?.topic}>
      <ActivityFrame {...frameProps(act)} mentor={mentor} experience={experience} onGenerate={(topic) => void act.generate(topic)}>
        {(item) => <MindMapView item={item as LearningItem<"mindmap">} mentor={mentor} />}
      </ActivityFrame>
    </ModuleShell>
  );
}

function layout(c: MindMapContent, mentor: MentorProfile, rtl: boolean) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const idByLabel = new Map<string, string>();
  nodes.push({
    id: "center",
    position: { x: 0, y: 0 },
    data: { label: c.center },
    style: {
      background: mentor.color.deep,
      color: "#fff",
      border: "none",
      borderRadius: 999,
      padding: "14px 22px",
      fontWeight: 700,
      fontSize: 16,
      width: "auto",
    },
  });
  idByLabel.set(c.center.toLowerCase(), "center");
  const n = c.branches.length;
  c.branches.forEach((b, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const dir = rtl ? -1 : 1;
    const bx = Math.cos(angle) * 300 * dir;
    const by = Math.sin(angle) * 220;
    const colour = BRANCH[i % BRANCH.length];
    const bid = `b${i}`;
    idByLabel.set(b.label.toLowerCase(), bid);
    nodes.push({
      id: bid,
      position: { x: bx - 80, y: by - 20 },
      data: { label: b.label },
      style: { background: colour.fill, border: `2px solid ${colour.line}`, borderRadius: 16, fontWeight: 600, color: "#142337", width: 170 },
    });
    edges.push({ id: `e-c-${bid}`, source: "center", target: bid, style: { stroke: colour.line, strokeWidth: 2.5 } });
    b.children.forEach((ch, j) => {
      const spread = (j - (b.children.length - 1) / 2) * 0.32;
      const cx = Math.cos(angle + spread) * 540 * dir;
      const cy = Math.sin(angle + spread) * 390;
      const cid = `${bid}c${j}`;
      idByLabel.set(ch.label.toLowerCase(), cid);
      nodes.push({
        id: cid,
        position: { x: cx - 70, y: cy - 16 },
        data: { label: ch.label },
        style: { background: "#FBF7F0", border: `1.5px solid ${colour.line}`, borderRadius: 12, fontSize: 12, color: "#142337", width: 150 },
      });
      edges.push({ id: `e-${bid}-${cid}`, source: bid, target: cid, style: { stroke: colour.line } });
    });
  });
  c.links.forEach((l, i) => {
    const s = idByLabel.get(l.from.toLowerCase());
    const t = idByLabel.get(l.to.toLowerCase());
    if (s && t && s !== t) {
      edges.push({
        id: `link-${i}`,
        source: s,
        target: t,
        label: l.label,
        animated: false,
        style: { stroke: "#8294A8", strokeDasharray: "6 4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8294A8" },
        labelStyle: { fontSize: 11, fill: "#4A5B6E" },
      });
    }
  });
  return { nodes, edges };
}

function MindMapView({ item, mentor }: { item: LearningItem<"mindmap">; mentor: MentorProfile }) {
  const t = useT();
  const c = item.content as MindMapContent;
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const [view, setView] = useState<"map" | "list">("map");
  const { nodes, edges } = useMemo(() => layout(c, mentor, rtl), [c, mentor, rtl]);
  const asText = [c.center, ...c.branches.map((b) => `${b.label}: ${b.children.map((x) => x.label).join(", ")}`)].join(". ");

  return (
    <div className="space-y-3" data-testid="mindmap-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label=""
          value={view}
          onChange={setView}
          options={[
            { value: "map", label: t("mindmap.mapView") },
            { value: "list", label: t("mindmap.listView") },
          ]}
        />
        <ReadAloudButton id={`map-${item.id}`} text={asText} />
      </div>

      {view === "map" ? (
        <>
          <div
            className="h-[60vh] min-h-[420px] overflow-hidden rounded-3xl border border-ink/10 bg-paper"
            role="img"
            aria-label={`${c.center}. ${asText}`}
            dir="ltr"
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.2}
              maxZoom={2}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={24} color="#EADCC6" />
              <Controls showInteractive={false} position="bottom-right" />
            </ReactFlow>
          </div>
          <p className="text-xs text-slate-deep">{t("mindmap.help")}</p>
        </>
      ) : (
        <Card className="p-6">
          <h2 className="font-display text-2xl" dir="auto">
            {c.center}
          </h2>
          <ul className="mt-3 space-y-3">
            {c.branches.map((b, i) => (
              <li key={i} className="border-s-4 ps-3" style={{ borderColor: BRANCH[i % BRANCH.length].line }}>
                <p className="font-semibold" dir="auto">
                  {b.label}
                </p>
                {b.summary && (
                  <p className="text-sm text-ink/80" dir="auto">
                    {b.summary}
                  </p>
                )}
                <ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm">
                  {b.children.map((ch, j) => (
                    <li key={j} dir="auto">
                      <span className="font-medium">{ch.label}</span>
                      {ch.detail ? ` — ${ch.detail}` : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {c.links.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold">{t("mindmap.links")}</h3>
              <ul className="mt-1 list-disc ps-5 text-sm">
                {c.links.map((l, i) => (
                  <li key={i} dir="auto">
                    {l.from} → {l.to}
                    {l.label ? ` (${l.label})` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
