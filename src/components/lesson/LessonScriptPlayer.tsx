import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useTts, type TtsLang } from '@/hooks/use-tts';
import type { LessonScriptStep } from '@/types/lesson-script';
import { resolveScriptText } from '@/types/lesson-script';

type Props = {
  script: LessonScriptStep[];
  lang: TtsLang;
  onComplete: () => void;
};

function getNarration(step: LessonScriptStep, lang: TtsLang) {
  return (
    resolveScriptText(step.narration, lang) ||
    resolveScriptText(step.text, lang) ||
    resolveScriptText(step.prompt, lang) ||
    resolveScriptText(step.boardText, lang)
  );
}

function getMainText(step: LessonScriptStep, lang: TtsLang) {
  return (
    resolveScriptText(step.text, lang) ||
    resolveScriptText(step.prompt, lang) ||
    resolveScriptText(step.boardText, lang) ||
    getNarration(step, lang)
  );
}

function renderPrimitive(primitive: Record<string, any>, i: number) {
  const type = primitive.type;
  const color = primitive.color || '#fde68a';
  if (type === 'shape') {
    return <text key={i} x={primitive.x || 100} y={primitive.y || 100} fontSize={primitive.size || 72}>{primitive.emoji || '⭐'}</text>;
  }
  if (type === 'text' || type === 'equation') {
    return (
      <text
        key={i}
        x={primitive.x || 100}
        y={primitive.y || 100}
        fontSize={primitive.size || (type === 'equation' ? 64 : 38)}
        fill={primitive.color || '#fff7cc'}
        fontWeight={800}
      >
        {primitive.text || ''}
      </text>
    );
  }
  if (type === 'underline') {
    return <line key={i} x1={primitive.x || 100} y1={primitive.y || 100} x2={(primitive.x || 100) + (primitive.w || 220)} y2={primitive.y || 100} stroke={color} strokeWidth={8} strokeLinecap="round" />;
  }
  if (type === 'circle') {
    return <circle key={i} cx={primitive.cx || 300} cy={primitive.cy || 250} r={primitive.r || 100} fill="none" stroke={color} strokeWidth={8} />;
  }
  if (type === 'line') {
    return <line key={i} x1={primitive.x1 || 100} y1={primitive.y1 || 100} x2={primitive.x2 || 300} y2={primitive.y2 || 300} stroke={color} strokeWidth={8} strokeLinecap="round" />;
  }
  return null;
}

function StepVisual({ step, lang }: { step: LessonScriptStep; lang: TtsLang }) {
  if (step.type === 'draw') {
    const primitives = Array.isArray(step.primitives) ? step.primitives : [];
    if (primitives.length > 0) {
      return (
        <div className="rounded-3xl bg-emerald-950 text-white p-3 shadow-inner">
          <div className="text-xl sm:text-2xl font-black mb-3 text-amber-100 font-indic px-2">{resolveScriptText(step.caption, lang) || resolveScriptText(step.text, lang) || 'Blackboard'}</div>
          <svg viewBox="0 0 1000 620" className="w-full min-h-[260px] max-h-[520px]" role="img" aria-label="Blackboard drawing">
            <rect x="0" y="0" width="1000" height="620" rx="26" fill="#052e2b" />
            {primitives.map(renderPrimitive)}
          </svg>
        </div>
      );
    }
    const emoji = step.emoji || step.object || '⭐';
    const count = Math.max(1, Math.min(step.count || 1, 10));
    return (
      <div className="rounded-3xl bg-emerald-950 text-white p-5 min-h-[220px] flex flex-col justify-center items-center shadow-inner">
        <div className="text-xl sm:text-2xl font-black mb-5 text-amber-100 font-indic">{resolveScriptText(step.boardText, lang) || resolveScriptText(step.caption, lang) || 'Look at the board'}</div>
        <div className="flex flex-wrap justify-center gap-4 text-6xl sm:text-7xl leading-none">
          {Array.from({ length: count }).map((_, i) => <span key={i}>{emoji}</span>)}
        </div>
      </div>
    );
  }

  if (step.type === 'count') {
    return (
      <div className="rounded-3xl bg-emerald-950 text-white p-5 min-h-[220px] flex flex-col justify-center items-center shadow-inner">
        <div className="text-xl sm:text-2xl font-black mb-5 text-amber-100">Count with me</div>
        <div className="flex flex-wrap justify-center gap-3">
          {(step.values || []).map((value, i) => (
            <span key={i} className="h-16 w-16 rounded-full bg-amber-200 text-emerald-950 grid place-items-center text-3xl font-black">
              {value}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (step.type === 'question') {
    return (
      <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 min-h-[180px] flex flex-col justify-center">
        <div className="text-sm font-black uppercase text-primary mb-2">Teacher asks</div>
        <div className="text-2xl sm:text-3xl font-black font-indic leading-relaxed">{getMainText(step, lang)}</div>
        {step.hint && <div className="mt-4 rounded-2xl bg-background p-3 text-sm font-semibold">Hint: {resolveScriptText(step.hint, lang)}</div>}
      </div>
    );
  }

  if (step.type === 'praise') {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-yellow-100 to-orange-100 p-5 min-h-[180px] flex flex-col justify-center items-center text-center">
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-2xl sm:text-3xl font-black font-indic leading-relaxed">{getMainText(step, lang) || 'Great job!'}</div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-card p-5 min-h-[180px] flex flex-col justify-center">
      <div className="text-sm font-black uppercase text-primary mb-2">Teacher says</div>
      <div className="text-2xl sm:text-3xl font-black font-indic leading-relaxed">{getMainText(step, lang)}</div>
    </div>
  );
}

export function LessonScriptPlayer({ script, lang, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const tts = useTts(lang, { rate: 0.85 });

  const steps = useMemo(() => (script || []).filter((s) => s && s.type), [script]);
  const step = steps[idx];
  const narration = step ? getNarration(step, lang) : '';
  const progress = steps.length ? Math.round(((idx + 1) / steps.length) * 100) : 0;

  useEffect(() => () => tts.stop(), []);

  if (!steps.length || !step) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground">No scripted teaching steps available for this stage.</p>
        <Button className="mt-4" onClick={onComplete}>Continue</Button>
      </Card>
    );
  }

  const goNext = () => {
    tts.stop();
    if (idx + 1 < steps.length) {
      setIdx((v) => v + 1);
      return;
    }
    setCompleted(true);
  };

  const goBack = () => {
    tts.stop();
    setIdx((v) => Math.max(0, v - 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-black uppercase text-primary">Script step {idx + 1} of {steps.length}</div>
        <div className="ml-auto text-xs text-muted-foreground">Manual teacher pace</div>
      </div>
      <Progress value={progress} />

      <StepVisual step={step} lang={lang} />

      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="secondary" onClick={() => narration && tts.speak(narration, lang)} disabled={!narration}>
          <Volume2 className="h-4 w-4 mr-1" /> Listen
        </Button>
        <Button variant="outline" onClick={tts.pause} disabled={!tts.speaking || tts.paused}>
          <Pause className="h-4 w-4 mr-1" /> Pause
        </Button>
        <Button variant="outline" onClick={tts.resume} disabled={!tts.paused}>
          <Play className="h-4 w-4 mr-1" /> Resume
        </Button>
        <Button variant="outline" onClick={() => narration && tts.speak(narration, lang)} disabled={!narration}>
          <RotateCcw className="h-4 w-4 mr-1" /> Replay
        </Button>
      </div>

      {!completed ? (
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={goBack} disabled={idx === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={goNext}>
            {idx + 1 < steps.length ? 'Next teaching step' : 'Finish teaching'} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="rounded-3xl bg-success/10 border border-success/30 p-4 flex flex-wrap items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <div className="font-black">Teaching steps completed.</div>
          <Button className="ml-auto" onClick={onComplete}>I understood</Button>
        </div>
      )}
    </div>
  );
}
