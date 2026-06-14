import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/AppHeader";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({ meta: [{ title: "Parent Portal" }] }),
  component: ParentShell,
});

function ParentShell() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}