import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Mic } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/reading")({
  component: () => (
    <Card className="p-10 text-center">
      <Mic className="h-12 w-12 mx-auto text-primary" />
      <h1 className="mt-4 text-3xl font-extrabold">Reading Check</h1>
      <p className="mt-2 text-muted-foreground">Read a passage aloud — we'll listen and give you smiley stickers for great reading.</p>
      <p className="mt-4 inline-block rounded-full bg-accent px-4 py-1 text-sm font-bold">Coming soon 🎤</p>
    </Card>
  ),
});