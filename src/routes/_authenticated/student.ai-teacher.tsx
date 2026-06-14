import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/ai-teacher")({
  component: () => (
    <Card className="p-10 text-center">
      <Sparkles className="h-12 w-12 mx-auto text-primary" />
      <h1 className="mt-4 text-3xl font-extrabold">AI Teacher</h1>
      <p className="mt-2 text-muted-foreground">Your friendly AI tutor will help explain lessons, answer questions, and read with you.</p>
      <p className="mt-4 inline-block rounded-full bg-accent px-4 py-1 text-sm font-bold">Coming soon ✨</p>
    </Card>
  ),
});