import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/homework")({
  component: () => (
    <Card className="p-10 text-center">
      <Wand2 className="h-12 w-12 mx-auto text-primary" />
      <h1 className="mt-4 text-3xl font-extrabold">Homework Generator</h1>
      <p className="mt-2 text-muted-foreground">Generate practice worksheets from the question bank by subject, unit, and difficulty.</p>
      <p className="mt-4 inline-block rounded-full bg-accent px-4 py-1 text-sm font-bold">Coming soon ✨</p>
    </Card>
  ),
});