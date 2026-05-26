import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Kanban, Sparkles, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Orbit</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/auth">Get started</Link></Button>
        </nav>
      </header>

      <main className="container mx-auto px-6">
        <section className="py-24 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> New — Kanban boards & realtime updates
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
            The workspace where teams <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>ship faster</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Plan projects, organize tasks on beautiful boards, and keep every conversation in one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2" style={{ boxShadow: "var(--shadow-glow)" }}>
              <Link to="/auth">Start for free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 pb-24 md:grid-cols-3">
          {[
            { icon: Kanban, title: "Kanban boards", desc: "Drag tasks across todo, in progress, review, and done." },
            { icon: CheckCircle2, title: "Smart tasks", desc: "Priorities, due dates, tags, and assignees built in." },
            { icon: Users, title: "Built for teams", desc: "Comment threads on every task. Roles & access baked in." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-secondary">
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Built with Orbit · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
