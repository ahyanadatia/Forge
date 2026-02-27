"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Circle, Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTask, updateTask } from "@/services/teams";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  owner_id: string | null;
}

interface Props {
  teamId: string;
  initialTasks: Task[];
}

export function TeamTaskList({ teamId, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const supabase = createClient();

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const task = await createTask(supabase, {
        team_id: teamId,
        title: newTitle.trim(),
      });
      setTasks([...tasks, task as any]);
      setNewTitle("");
    } catch {
      // Ignore
    }
    setAdding(false);
  };

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await updateTask(supabase, task.id, { status: newStatus });
      setTasks(
        tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch {
      // Ignore
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Tasks ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => handleToggle(task)}
            className={cn(
              "flex items-center gap-2 w-full text-left text-sm rounded-md py-1 transition-colors hover:text-foreground",
              task.status === "done" && "text-muted-foreground line-through"
            )}
          >
            {task.status === "done" ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            {task.title}
          </button>
        ))}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Add a task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0"
            onClick={handleAdd}
            disabled={adding || !newTitle.trim()}
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
