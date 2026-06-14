import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "te";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "te", label: "తెలుగు" },
];

// UI translations
const dict: Record<string, Record<Lang, string>> = {
  app_name: { en: "Sunrise School", hi: "सनराइज स्कूल", te: "సన్‌రైజ్ స్కూల్" },
  welcome: { en: "Welcome", hi: "स्वागत है", te: "స్వాగతం" },
  sign_in: { en: "Sign in", hi: "साइन इन", te: "సైన్ ఇన్" },
  sign_up: { en: "Sign up", hi: "साइन अप", te: "నమోదు" },
  sign_out: { en: "Sign out", hi: "साइन आउट", te: "సైన్ అవుట్" },
  email: { en: "Email", hi: "ईमेल", te: "ఇమెయిల్" },
  password: { en: "Password", hi: "पासवर्ड", te: "పాస్‌వర్డ్" },
  full_name: { en: "Full name", hi: "पूरा नाम", te: "పూర్తి పేరు" },
  continue_with_google: { en: "Continue with Google", hi: "Google से जारी रखें", te: "Google తో కొనసాగండి" },
  parent_login: { en: "Parent login", hi: "अभिभावक लॉगिन", te: "తల్లిదండ్రుల లాగిన్" },
  student_login: { en: "Student login", hi: "छात्र लॉगिन", te: "విద్యార్థి లాగిన్" },
  pin: { en: "Student PIN", hi: "छात्र पिन", te: "విద్యార్థి పిన్" },
  students: { en: "My Students", hi: "मेरे छात्र", te: "నా విద్యార్థులు" },
  add_student: { en: "Add a child", hi: "बच्चा जोड़ें", te: "పిల్లవాడిని జోడించండి" },
  start_learning: { en: "Start learning", hi: "सीखना शुरू करें", te: "నేర్చుకోవడం ప్రారంభించండి" },
  todays_school: { en: "Today's School", hi: "आज की पाठशाला", te: "నేటి పాఠశాల" },
  subjects: { en: "Subjects", hi: "विषय", te: "విషయాలు" },
  lessons: { en: "Lessons", hi: "पाठ", te: "పాఠాలు" },
  assignments: { en: "Assignments", hi: "होमवर्क", te: "హోంవర్క్" },
  tests: { en: "Tests", hi: "परीक्षाएँ", te: "పరీక్షలు" },
  rewards: { en: "Rewards", hi: "पुरस्कार", te: "పురస్కారాలు" },
  progress: { en: "Progress", hi: "प्रगति", te: "ప్రగతి" },
  attendance: { en: "Attendance", hi: "उपस्थिति", te: "హాజరు" },
  coins: { en: "Coins", hi: "सिक्के", te: "నాణేలు" },
  stars: { en: "Stars", hi: "तारे", te: "నక్షత్రాలు" },
  streak: { en: "Day Streak", hi: "लगातार दिन", te: "వరుస రోజులు" },
  next: { en: "Next", hi: "आगे", te: "తదుపరి" },
  back: { en: "Back", hi: "पीछे", te: "వెనుక" },
  done: { en: "Done!", hi: "हो गया!", te: "పూర్తయింది!" },
  great_job: { en: "Great job! 🎉", hi: "बहुत बढ़िया! 🎉", te: "చాలా బాగుంది! 🎉" },
  try_again: { en: "Try again", hi: "फिर से कोशिश", te: "మళ్ళీ ప్రయత్నించండి" },
  correct: { en: "Correct!", hi: "सही!", te: "సరైనది!" },
  check: { en: "Check answer", hi: "जाँचें", te: "తనిఖీ చేయండి" },
  submit: { en: "Submit", hi: "जमा करें", te: "సమర్పించండి" },
  finish: { en: "Finish", hi: "समाप्त", te: "ముగించు" },
  score: { en: "Score", hi: "स्कोर", te: "స్కోర్" },
  complete_lesson: { en: "Complete lesson", hi: "पाठ पूरा करें", te: "పాఠాన్ని పూర్తి చేయండి" },
  pending_lessons: { en: "Pending lessons", hi: "बाकी पाठ", te: "మిగిలిన పాఠాలు" },
  attendance_today: { en: "Marked present today", hi: "आज उपस्थित", te: "ఈరోజు హాజరు" },
  recovery_plan: { en: "Catch-up plan", hi: "रिकवरी प्लान", te: "క్యాచ్-అప్ ప్లాన్" },
  language: { en: "Language", hi: "भाषा", te: "భాష" },
  trophy_room: { en: "Trophy Room", hi: "ट्रॉफी रूम", te: "ట్రోఫీ గది" },
  no_rewards_yet: { en: "Complete lessons to earn rewards!", hi: "पुरस्कार के लिए पाठ पूरे करें!", te: "పురస్కారాల కోసం పాఠాలు పూర్తి చేయండి!" },
  this_month: { en: "This month", hi: "इस महीने", te: "ఈ నెల" },
  loading: { en: "Loading…", hi: "लोड हो रहा है…", te: "లోడ్ అవుతోంది…" },
  start_test: { en: "Start test", hi: "परीक्षा शुरू करें", te: "పరీక్ష ప్రారంభించండి" } as any,
  time_left: { en: "Time left", hi: "बचा समय", te: "మిగిలిన సమయం" } as any,
  passed: { en: "Passed 🎉", hi: "उत्तीर्ण 🎉", te: "ఉత్తీర్ణత 🎉" } as any,
  failed: { en: "Try again", hi: "फिर से कोशिश", te: "మళ్ళీ ప్రయత్నించండి" } as any,
  parent_portal: { en: "Parent Portal", hi: "अभिभावक पोर्टल", te: "తల్లిదండ్రుల పోర్టల్" } as any,
  ai_teacher: { en: "AI Teacher", hi: "एआई शिक्षक", te: "AI ఉపాధ్యాయుడు" } as any,
  reading_assessment: { en: "Reading Check", hi: "पठन जांच", te: "పఠన పరీక్ష" } as any,
  coming_soon: { en: "Coming soon", hi: "जल्द आ रहा है", te: "త్వరలో వస్తోంది" } as any,
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: keyof typeof dict) => string; tr: (val: unknown) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem("vls.lang") as Lang | null) ?? "en";
    setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("vls.lang", l);
  };
  const t = (key: keyof typeof dict) => dict[key]?.[lang] ?? dict[key]?.en ?? String(key);
  const tr = (val: unknown): string => {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      const o = val as Record<string, string>;
      return o[lang] ?? o.en ?? Object.values(o)[0] ?? "";
    }
    return String(val);
  };
  return <I18nContext.Provider value={{ lang, setLang, t, tr }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}