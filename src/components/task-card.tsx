import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-300",
  medium: "bg-blue-500/20 text-blue-300",
  high: "bg-amber-500/20 text-amber-300",
  urgent: "bg-rose-500/20 text-rose-300",
};

export function TaskCard({ task, onStatusChange }: { task: TaskRow; onStatusChange: (status: "todo" | "in_progress" | "in_review" | "done") => void }) {
  return (
    <Card className="cursor-default border-border/60 transition-all hover:border-primary/40">
      <CardContent className="p-3">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={PRIORITY_COLORS[task.priority] ?? ""} variant="secondary">{task.priority}</Badge>
            {task.due_date && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />{new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
          <Select value={task.status} onValueChange={(v) => onStatusChange(v as any)}>
            <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To do</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}