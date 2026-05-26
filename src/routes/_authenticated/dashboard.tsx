import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, ListChecks, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [projects, tasks, doneTasks, overdue] = await Promise.all([
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", new Date().toISOString()).neq("status", "done"),
      ]);
      const recent = await supabase.from("tasks").select("id,title,status,priority,due_date,projects(name,color)").order("created_at", { ascending: false }).limit(8);
      return {
        projects: projects.count ?? 0,
        tasks: tasks.count ?? 0,
        done: doneTasks.count ?? 0,
        overdue: overdue.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Projects", value: data?.projects ?? 0, icon: FolderKanban, color: "text-primary" },
    { label: "Total tasks", value: data?.tasks ?? 0, icon: ListChecks, color: "text-accent" },
    { label: "Completed", value: data?.done ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Overdue", value: data?.overdue ?? 0, icon: Clock, color: "text-rose-400" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">An overview of your projects and tasks.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-3xl font-bold">{s.value}</p>
              </div>
              <s.icon className={`h-8 w-8 ${s.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent tasks</CardTitle></CardHeader>
        <CardContent>
          {(data?.recent ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tasks yet. <Link to="/projects" className="text-primary underline">Create a project</Link> to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data!.recent.map((t: any) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {t.projects && <span className="h-2 w-2 rounded-full" style={{ background: t.projects.color }} />}
                    <span className="text-sm">{t.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{t.status.replace("_", " ")} · {t.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}