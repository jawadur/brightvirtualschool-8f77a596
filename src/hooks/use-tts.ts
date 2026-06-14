import { useCallback, useEffect, useRef, useState } from "react";

export type TtsLang = "en" | "hi" | "te";

const LANG_MAP: Record<TtsLang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

const FEMALE_RE =
  /female|woman|girl|samantha|victoria|tessa|fiona|karen|moira|veena|priya|aditi|raveena|geeta|swara|kalpana|lekha|asha|neerja|heera|rashmi|google.*(india|hindi|telugu)/i;
const MALE_RE = /\bmale\b|\bman\b|\bboy\b|ravi|hemant|prabhat/i;

/** Wait for browser voices to load (Chrome loads async). */
export function loadVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve([]);
    const synth = window.speechSynthesis;
    const ready = synth.getVoices();
    if (ready.length) return resolve(ready);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener?.("voiceschanged", finish);
    setTimeout(finish, timeoutMs);
  });
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: TtsLang,
  preferredUri?: string | null,
): SpeechSynthesisVoice | undefined {
  if (preferredUri) {
    const pref = voices.find((v) => v.voiceURI === preferredUri);
    if (pref) return pref;
  }
  const target = LANG_MAP[lang];
  const inLang = voices.filter((v) => v.lang?.toLowerCase() === target.toLowerCase());
  const inLangLoose = voices.filter((v) => v.lang?.toLowerCase().startsWith(lang));
  const female = (v: SpeechSynthesisVoice) => FEMALE_RE.test(v.name || "") && !MALE_RE.test(v.name || "");
  return (
    inLang.find(female) ||
    inLangLoose.find(female) ||
    inLang[0] ||
    inLangLoose[0] ||
    voices.find((v) => v.lang?.startsWith("en") && female(v)) ||
    voices.find((v) => v.lang?.startsWith("en"))
  );
}

export interface VoiceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string | null;
}

export interface UseTtsResult {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  voicesReady: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, lang?: TtsLang, opts?: VoiceOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useTts(defaultLang: TtsLang = "en", defaults: VoiceOptions = {}): UseTtsResult {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const supported = typeof window !== "undefined" && !!window.speechSynthesis;
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Keep latest defaults without re-creating speak()
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    loadVoices().then((v) => {
      if (cancelled) return;
      setVoices(v);
      setVoicesReady(true);
    });
    const onChange = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
    return () => {
      cancelled = true;
      window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
    };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    currentRef.current = null;
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: TtsLang = defaultLang, opts: VoiceOptions = {}) => {
      if (!supported || !text?.trim()) return;
      const synth = window.speechSynthesis;
      const merged = { ...defaultsRef.current, ...opts };

      const doSpeak = (vs: SpeechSynthesisVoice[]) => {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(vs, lang, merged.voiceURI ?? null);
        if (voice) u.voice = voice;
        u.lang = LANG_MAP[lang];
        u.rate = clamp(merged.rate ?? 0.9, 0.5, 1.5);
        u.pitch = clamp(merged.pitch ?? 1, 0.5, 2);
        u.volume = clamp(merged.volume ?? 1, 0, 1);
        u.onstart = () => { setSpeaking(true); setPaused(false); };
        u.onend = () => { setSpeaking(false); setPaused(false); currentRef.current = null; };
        u.onerror = () => { setSpeaking(false); setPaused(false); currentRef.current = null; };
        currentRef.current = u;
        // Safari quirk: speechSynthesis pauses on long idle; resume defensively.
        try { synth.resume(); } catch { /* noop */ }
        synth.speak(u);
      };

      const have = synth.getVoices();
      if (have.length) doSpeak(have);
      else loadVoices().then(doSpeak);
    },
    [defaultLang, supported],
  );

  const pause = useCallback(() => { if (supported) { window.speechSynthesis.pause(); setPaused(true); } }, [supported]);
  const resume = useCallback(() => { if (supported) { window.speechSynthesis.resume(); setPaused(false); } }, [supported]);
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { supported, speaking, paused, voicesReady, voices, speak, pause, resume, stop };
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }