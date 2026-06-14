import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { aiTeacherChat } from "@/lib/ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

function AiTeacherPage() {
  const chat = useServerFn(aiTeacherChat);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Miss Bright ✨ Ask me anything about your lessons!" },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mut = useMutation({
    mutationFn: async (text: string) => {
      const next = [...messages, { role: "user" as const, content: text }];
      setMessages(next);
      const res = await chat({ data: { messages: next, language: "en" } });
      return res.reply;
    },
    onSuccess: (reply) => {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
    },
    onError: (e: Error) => {
      setMessages((m) => [...m, { role: "assistant", content: `Oops! ${e.message}` }]);
    },
  });

  function send() {
    const t = input.trim();
    if (!t || mut.isPending) return;
    setInput("");
    mut.mutate(t);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-primary/10 p-3"><Sparkles className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-extrabold">AI Teacher</h1>
          <p className="text-sm text-muted-foreground">Miss Bright is here to help! 🌟</p>
        </div>
      </div>
      <Card className="p-4">
        <div ref={scrollRef} className="h-[55vh] overflow-y-auto space-y-3 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {mut.isPending && (
            <div className="flex justify-start"><div className="rounded-2xl bg-muted px-4 py-2 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> thinking…</div></div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask Miss Bright…"
            disabled={mut.isPending}
          />
          <Button onClick={send} disabled={mut.isPending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/student/ai-teacher")({
  component: AiTeacherPage,
});