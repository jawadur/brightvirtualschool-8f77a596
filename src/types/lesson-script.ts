export type LessonScriptLang = 'en' | 'hi' | 'te';

export type LessonScriptText = string | Partial<Record<LessonScriptLang, string>>;

export type LessonScriptStep = {
  id?: string;
  type: 'speech' | 'pause' | 'draw' | 'count' | 'question' | 'praise' | 'highlight';
  text?: LessonScriptText;
  narration?: LessonScriptText;
  boardText?: LessonScriptText;
  caption?: LessonScriptText;
  prompt?: LessonScriptText;
  emoji?: string;
  object?: string;
  count?: number;
  values?: Array<string | number>;
  seconds?: number;
  options?: string[];
  correctAnswer?: string | number;
  hint?: LessonScriptText;
  primitives?: Array<Record<string, any>>;
};

export function resolveScriptText(value: LessonScriptText | null | undefined, lang: LessonScriptLang = 'en') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.hi || value.te || '';
}
