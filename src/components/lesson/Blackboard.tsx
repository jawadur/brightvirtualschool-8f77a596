import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Volume2, Square } from "lucide-react";
import { useTts, type TtsLang } from "@/hooks/use-tts";
import { useStudentPrefs } from "@/lib/student-prefs";
import { getText } from "@/lib/text";

/**
 * Virtual Blackboard: SVG-based chalk demo with step-by-step reveal.
 *
 * Coordinate system: 0..1000 wide × 0..600 tall, scaled to container.
 */

export type ChalkPrimitive =
  | { type: "text"; x: number; y: number; text: string; size?: number; color?: string; lang?: TtsLang; bold?: boolean }
  | { type: "equation"; x: number; y: number; text: string; size?: number; color?: string }
  | { type: "underline"; x: number; y: number; w: number; color?: string }
  | { type: "circle"; cx: number; cy: number; r: number; color?: string }
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number; color?: string }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; color?: string }
  | { type: "rect"; x: number; y: number; w: number; h: number; color?: string }
  | { type: "shape"; emoji: string; x: number; y: number; size?: number };

export type BlackboardStep = {
  narration?: string;
  caption?: string;
  primitives: ChalkPrimitive[];
};

export interface BlackboardProps {
  steps: BlackboardStep[];
  lang?: TtsLang;
  /** Minimum time the child must spend on this blackboard before it can be completed. */
  minDurationSeconds?: number;
  /** Called when the student finishes the last step. */
  onComplete?: () => void;
}

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function Blackboard({ steps, lang = "en", minDurationSeconds = 0, onComplete }: BlackboardProps) {
  const { prefs } = useStudentPrefs();
  const tts = useTts(lang, {
    rate: prefs.speech_rate,
    pitch: prefs.speech_pitch,
    volume: prefs.speech_volume,
    voiceURI: prefs.preferred_voice_uri,
  });
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const total = steps.length;
  const step = steps[idx];
  const advancedRef = useRef(false);
  const minRemaining = Math.max(0, minDurationSeconds - elapsed);
  const minMet = minRemaining <= 0;

  useEffect(() => {
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [minDurationSeconds]);

  // Visible primitives = all steps up to current
  const visible = useMemo(() => {
    const out: { p: ChalkPrimitive; step: number }[] = [];
    for (let i = 0; i <= idx; i++) {
      for (const p of steps[i]?.primitives ?? []) {
        if (p && (p as any).type) out.push({ p, step: i });
      }
    }
    return out;
  }, [idx, steps]);

  // Narrate on step change when playing
  useEffect(() => {
    advancedRef.current = false;
    if (playing && step?.narration) {
      tts.speak(step.narration, lang);
    }
    return () => tts.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing]);

  // Auto-advance when narration finishes
  useEffect(() => {
    if (!playing) return;
    if (tts.speaking || tts.paused) return;
    if (advancedRef.current) return;
    // small delay so the last word can breathe
    const t = setTimeout(() => {
      advancedRef.current = true;
      if (idx + 1 < total) setIdx(idx + 1);
      else { setPlaying(false); if (minMet) onComplete?.(); }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.speaking, tts.paused, playing, idx, total, minMet]);

  if (total === 0) {
    return (
      <div className="rounded-2xl bg-emerald-950 text-emerald-50 p-8 text-center">
        <p className="opacity-80">The teacher hasn't prepared this blackboard yet.</p>
      </div>
    );
  }

  const go = (n: number) => {
    tts.stop();
    setPlaying(false);
    setIdx(Math.max(0, Math.min(total - 1, n)));
  };

  return (
    <div className="space-y-3">
      <div className="relative rounded-3xl shadow-pop overflow-hidden border-[6px] border-amber-900/80">
        {/* Frame & board */}
        <div className="bg-gradient-to-b from-emerald-950 to-emerald-900 p-3 sm:p-5">
          <svg
            viewBox="0 0 1000 600"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto rounded-xl bg-[radial-gradient(ellipse_at_center,#0f5132_0%,#0b3d27_70%,#072a1c_100%)]"
            role="img"
            aria-label={step?.caption ?? `Blackboard step ${idx + 1}`}
          >
            <defs>
              {/* Chalky stroke filter */}
              <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                <feDisplacementMap in="SourceGraphic" scale="2.4" />
              </filter>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#fef9c3" />
              </marker>
            </defs>

            {/* faint horizontal guide lines (paper-feel) */}
            <g opacity="0.06" stroke="#ffffff" strokeWidth="1">
              {[120, 220, 320, 420, 520].map((y) => (
                <line key={y} x1="20" x2="980" y1={y} y2={y} />
              ))}
            </g>

            <g filter="url(#chalk)">
              {visible.map(({ p, step: stepIdx }, i) => {
                const isCurrent = stepIdx === idx;
                const drawIn = isCurrent ? "blackboard-draw-in" : "";
                const color = (p as any).color ?? "#fef9c3";
                switch (p.type) {
                  case "text":
                  case "equation": {
                    const size = p.size ?? (p.type === "equation" ? 60 : 44);
                    return (
                      <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        fill={color}
                        fontSize={size}
                        fontWeight={(p as any).bold || p.type === "equation" ? 800 : 700}
                        className={`${drawIn} font-indic`}
                        style={{ fontFamily: "'Caveat','Patrick Hand','Comic Sans MS','Noto Sans Telugu','Noto Sans Devanagari',cursive" }}
                        lang={(p as any).lang}
                      >
                        {getText((p as any).text, lang)}
                      </text>
                    );
                  }
                  case "underline":
                    return (
                      <line
                        key={i}
                        x1={p.x}
                        y1={p.y}
                        x2={p.x + p.w}
                        y2={p.y}
                        stroke={color}
                        strokeWidth={5}
                        strokeLinecap="round"
                        className={drawIn}
                        style={isCurrent ? { strokeDasharray: p.w, strokeDashoffset: p.w, animation: "chalk-stroke 0.9s ease-out forwards" } : undefined}
                      />
                    );
                  case "line":
                  case "arrow": {
                    const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
                    return (
                      <line
                        key={i}
                        x1={p.x1}
                        y1={p.y1}
                        x2={p.x2}
                        y2={p.y2}
                        stroke={color}
                        strokeWidth={5}
                        strokeLinecap="round"
                        markerEnd={p.type === "arrow" ? "url(#arrowhead)" : undefined}
                        style={isCurrent ? { strokeDasharray: len, strokeDashoffset: len, animation: "chalk-stroke 0.9s ease-out forwards" } : undefined}
                      />
                    );
                  }
                  case "circle": {
                    const circ = 2 * Math.PI * p.r;
                    return (
                      <circle
                        key={i}
                        cx={p.cx}
                        cy={p.cy}
                        r={p.r}
                        fill="none"
                        stroke={color}
                        strokeWidth={5}
                        style={isCurrent ? { strokeDasharray: circ, strokeDashoffset: circ, animation: "chalk-stroke 1s ease-out forwards" } : undefined}
                      />
                    );
                  }
                  case "rect": {
                    const peri = 2 * (p.w + p.h);
                    return (
                      <rect
                        key={i}
                        x={p.x}
                        y={p.y}
                        width={p.w}
                        height={p.h}
                        fill="none"
                        stroke={color}
                        strokeWidth={5}
                        rx={8}
                        style={isCurrent ? { strokeDasharray: peri, strokeDashoffset: peri, animation: "chalk-stroke 1s ease-out forwards" } : undefined}
                      />
                    );
                  }
                  case "shape":
                    return (
                      <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        fontSize={p.size ?? 60}
                        className={drawIn}
                      >
                        {getText((p as any).emoji, lang) || "⭐"}
                      </text>
                    );
                  default:
                    return null;
                }
              })}
            </g>

            {/* Bottom chalk ledge */}
            <rect x="0" y="585" width="1000" height="15" fill="#7c4a1e" />
            <rect x="40" y="588" width="60" height="6" rx="3" fill="#f3f4f6" opacity="0.8" />
            <rect x="120" y="588" width="30" height="6" rx="3" fill="#fde68a" opacity="0.8" />
          </svg>
        </div>

        {/* Caption strip */}
        {step?.caption && (
          <div className="bg-emerald-950/90 text-emerald-50 px-4 py-2 text-sm sm:text-base font-bold no-clip font-indic" lang={lang}>
            👩‍🏫 {getText(step.caption, lang)}
          </div>
        )}
      </div>

      {minDurationSeconds > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-bold text-amber-900">
          Blackboard teaching time: {minMet ? "Ready to continue" : `${formatTime(minRemaining)} remaining`}
        </div>
      )}

      <Progress value={Math.round(((idx + 1) / total) * 100)} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted-foreground mr-1">Step {idx + 1} of {total}</span>
        <Button size="sm" variant="outline" onClick={() => go(idx - 1)} disabled={idx === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button size="sm" variant="outline" onClick={() => go(idx + 1)} disabled={idx >= total - 1}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        {step?.narration && (
          <>
            <Button size="sm" variant="outline" onClick={() => tts.speak(getText(step.narration, lang), lang)}>
              <Volume2 className="h-4 w-4 mr-1" /> Listen
            </Button>
            <Button size="sm" variant="outline" onClick={() => tts.speak(getText(step.narration, lang), lang)}>
              <RotateCcw className="h-4 w-4 mr-1" /> Replay
            </Button>
          </>
        )}
        {!playing ? (
          <Button size="sm" className="rounded-2xl gap-1 ml-auto" onClick={() => setPlaying(true)}>
            <Play className="h-4 w-4" /> Play all
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="rounded-2xl gap-1 ml-auto" onClick={() => { setPlaying(false); tts.stop(); }}>
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}
        {tts.speaking && (
          <Button size="sm" variant="ghost" onClick={tts.stop}><Square className="h-4 w-4" /></Button>
        )}
        {idx >= total - 1 && (
          <Button size="sm" variant="default" onClick={onComplete} disabled={!minMet}>
            {minMet ? "I understood ✓" : `Listen first ${formatTime(minRemaining)}`}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Try to coerce a stage's `slides` field into BlackboardStep[].
 * Supports the explicit format above and a minimal `{ caption, narration, text }`
 * shorthand that just writes one line of chalk per step.
 */
export function coerceBlackboardSteps(input: any): BlackboardStep[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw: any, i: number): BlackboardStep => {
    if (Array.isArray(raw?.primitives)) {
      return {
        narration: raw.narration ?? raw.body ?? raw.caption,
        caption: raw.caption ?? raw.title,
        primitives: raw.primitives,
      };
    }
    // Shorthand: render the line of text centered, with optional underline.
    const text: string = raw?.body ?? raw?.text ?? raw?.title ?? `Step ${i + 1}`;
    return {
      narration: raw?.narration ?? text,
      caption: raw?.caption ?? raw?.title,
      primitives: [
        { type: "text", x: 80, y: 320, text, size: 56 },
      ],
    };
  });
}