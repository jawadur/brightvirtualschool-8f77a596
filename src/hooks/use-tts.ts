import { useCallback, useEffect, useRef, useState } from "react";

export type TtsLang = "en" | "hi" | "te";

const LANG_MAP: Record<TtsLang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

function pickVoice(lang: TtsLang): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const target = LANG_MAP[lang];
  const isFemale = (v: SpeechSynthesisVoice) =>
    /female|woman|girl|samantha|victoria|tessa|fiona|karen|moira|veena|priya|aditi|raveena|geeta|swara|kalpana|lekha|asha/i.test(
      v.name || "",
    );
  const inLang = voices.filter((v) => v.lang === target);
  const inLangLoose = voices.filter((v) => v.lang?.startsWith(lang));
  return (
    inLang.find(isFemale) ||
    inLangLoose.find(isFemale) ||
    inLang[0] ||
    inLangLoose[0] ||
    voices.find(isFemale) ||
    voices.find((v) => v.lang?.startsWith("en"))
  );
}

export interface UseTtsResult {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  speak: (text: string, lang?: TtsLang) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * Browser SpeechSynthesis wrapper.
 * Uses en-IN / hi-IN / te-IN voices when available.
 */
export function useTts(defaultLang: TtsLang = "en", rate = 0.9): UseTtsResult {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const supported = typeof window !== "undefined" && !!window.speechSynthesis;
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Prime voices on mount (Chrome loads them async)
  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.getVoices();
    const onChange = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    currentRef.current = null;
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: TtsLang = defaultLang) => {
      if (!supported || !text?.trim()) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(lang);
      if (voice) u.voice = voice;
      u.lang = LANG_MAP[lang];
      u.rate = rate;
      u.pitch = 1;
      u.onstart = () => { setSpeaking(true); setPaused(false); };
      u.onend = () => { setSpeaking(false); setPaused(false); currentRef.current = null; };
      u.onerror = () => { setSpeaking(false); setPaused(false); currentRef.current = null; };
      currentRef.current = u;
      window.speechSynthesis.speak(u);
    },
    [defaultLang, rate, supported],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  // Stop on unmount
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { supported, speaking, paused, speak, pause, resume, stop };
}