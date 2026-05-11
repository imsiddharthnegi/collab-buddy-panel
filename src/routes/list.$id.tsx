import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { SharePanel, type Collaborator } from "@/components/share-panel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DbTask = Tables<"tasks">;
type DbList = Tables<"lists">;

type Task = {
  id: string;
  text: string;
  completed: boolean;
  creator: {
    id: string;
    name: string;
  };
};

function initialsOf(name: string) {
  if (name.toLowerCase() === "you") return "You";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarTone(name: string) {
  const tones = [
    "bg-muted text-muted-foreground",
    "bg-secondary text-secondary-foreground",
    "bg-accent text-accent-foreground",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return tones[Math.abs(hash) % tones.length];
}

export const Route = createFileRoute("/list/$id")({
  component: ListView,
});

function ListView() {
  const { id: listId } = Route.useParams();
  const navigate = useNavigate();
  
  const [list, setList] = useState<DbList | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // Fetch list details
  const fetchList = useCallback(async () => {
    const { data, error } = await supabase
      .from("lists")
      .select("*")
      .eq("id", listId)
      .single();

    if (error) {
      console.error("Error fetching list:", error);
      toast.error("List not found");
      navigate({ to: "/" });
      return null;
    }
    
    setList(data);
    return data;
  }, [listId, navigate]);

  // Fetch tasks for the list
  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    // Get unique creator IDs
    const creatorIds = [...new Set(data.map((t) => t.created_by))];
    
    // Fetch profiles for creators
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", creatorIds);

      if (profiles) {
        const map: Record<string, string> = {};
        profiles.forEach((p) => {
          map[p.id] = p.name ?? "Unknown";
        });
        setProfilesMap((prev) => ({ ...prev, ...map }));
      }
    }

    const mappedTasks: Task[] = data.map((t) => ({
      id: t.id,
      text: t.title,
      completed: t.completed,
      creator: {
        id: t.created_by,
        name: t.created_by === currentUserId ? "You" : (profilesMap[t.created_by] ?? "Unknown"),
      },
    }));

    setTasks(mappedTasks);
  }, [listId, currentUserId, profilesMap]);

  // Fetch collaborators
  const fetchCollaborators = useCallback(async () => {
    const { data, error } = await supabase
      .from("list_collaborators")
      .select("user_id")
      .eq("list_id", listId);

    if (error) {
      console.error("Error fetching collaborators:", error);
      return;
    }

    if (data.length > 0) {
      const userIds = data.map((c) => c.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      if (profiles) {
        setCollaborators(
          profiles.map((p) => ({
            id: p.id,
            name: p.name ?? "Unknown",
          }))
        );
      }
    } else {
      setCollaborators([]);
    }
  }, [listId]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchList();
      await fetchTasks();
      await fetchCollaborators();
      setLoading(false);
    };
    loadData();
  }, [fetchList, fetchTasks, fetchCollaborators]);

  // Real-time subscription for tasks
  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${listId}`)
      .on<DbTask>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `list_id=eq.${listId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbTask>) => {
          if (payload.eventType === "INSERT") {
            const newTask = payload.new;
            setTasks((prev) => {
              // Avoid duplicates
              if (prev.some((t) => t.id === newTask.id)) return prev;
              return [
                ...prev,
                {
                  id: newTask.id,
                  text: newTask.title,
                  completed: newTask.completed,
                  creator: {
                    id: newTask.created_by,
                    name: newTask.created_by === currentUserId ? "You" : (profilesMap[newTask.created_by] ?? "Someone"),
                  },
                },
              ];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new;
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updated.id
                  ? { ...t, text: updated.title, completed: updated.completed }
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old;
            setTasks((prev) => prev.filter((t) => t.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId, currentUserId, profilesMap]);

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const isEmpty = tasks.length === 0;
  const showAddBar = !isEmpty || composing;
  const isCreator = list?.created_by === currentUserId;

  const shareUrl = list?.share_slug
    ? `${window.location.origin}/join/${list.share_slug}`
    : "";

  const startComposing = () => {
    setComposing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const addTask = async () => {
    const text = draft.trim();
    if (!text || !currentUserId) return;

    const { error } = await supabase.from("tasks").insert({
      list_id: listId,
      title: text,
      created_by: currentUserId,
    });

    if (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
      return;
    }

    setDraft("");
  };

  const toggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", id);

    if (error) {
      console.error("Error toggling task:", error);
      toast.error("Failed to update task");
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleLeave = async () => {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("list_collaborators")
      .delete()
      .eq("list_id", listId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error leaving list:", error);
      toast.error("Failed to leave list");
      return;
    }

    toast.success("You left the list");
    setShareOpen(false);
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">List not found</p>
        <Button asChild variant="outline">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <AppHeader
        listTitle={list.title}
        onShare={() => setShareOpen(true)}
        showLeave={!isCreator}
        onLeave={() => setShareOpen(true)}
      />
      <SharePanel
        open={shareOpen}
        onOpenChange={setShareOpen}
        listTitle={list.title}
        shareUrl={shareUrl}
        collaborators={collaborators}
        isCreator={isCreator}
        onLeave={handleLeave}
      />
      <div className="flex min-h-screen flex-col px-4 py-8 pb-32 sm:px-6 sm:py-12 sm:pb-16">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <header className="mt-6 mb-8 space-y-2 sm:mt-8 sm:mb-12">
            <p className="text-sm font-medium tracking-wide text-muted-foreground">
              {isCreator ? "Your list" : "Shared list"}
            </p>
            <h1 className="break-words text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              {list.title}
            </h1>
          </header>

          {isEmpty && !composing ? (
            <EmptyState onAdd={startComposing} />
          ) : (
            <>
              <Section title="Active Tasks" count={active.length}>
                {active.length === 0 ? (
                  <EmptyRow text="Nothing active. Add a task below." />
                ) : (
                  active.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggle(task.id)}
                      onDelete={() => remove(task.id)}
                    />
                  ))
                )}
              </Section>

              {completed.length > 0 && (
                <Section title="Completed Tasks" count={completed.length}>
                  {completed.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggle(task.id)}
                      onDelete={() => remove(task.id)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}

          {showAddBar && (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mt-12 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
              <div className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-xl border border-border bg-card p-2 pl-4 transition focus-within:border-foreground/40">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTask();
                    } else if (e.key === "Escape" && isEmpty) {
                      setComposing(false);
                      setDraft("");
                    }
                  }}
                  placeholder="Add a task"
                  maxLength={200}
                  className="h-11 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  onClick={addTask}
                  disabled={!draft.trim()}
                  className="auth-primary h-10 px-4 sm:h-9"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border text-muted-foreground">
        <Plus className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <p className="mt-6 text-base text-muted-foreground">
        Start by adding your first task.
      </p>
      <Button
        type="button"
        onClick={onAdd}
        className="auth-primary mt-8 h-11 px-5"
      >
        Add your first task
      </Button>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground/70">{count}</span>
      </div>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <li className="rounded-lg px-4 py-3 text-sm text-muted-foreground">
      {text}
    </li>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  const handleDelete = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDelete, 200);
  };

  return (
    <li
      className="task-row group flex items-center gap-3 rounded-lg px-3 py-4 sm:gap-4 sm:px-4 sm:py-3"
      data-leaving={leaving || undefined}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={onToggle}
        className="task-checkbox h-6 w-6 shrink-0 rounded-full border-muted-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground sm:h-5 sm:w-5"
        aria-label={task.completed ? "Mark as active" : "Mark as completed"}
      />
      <span
        onClick={onToggle}
        data-completed={task.completed || undefined}
        className="task-text min-w-0 flex-1 cursor-pointer select-none break-words text-base leading-relaxed text-foreground"
      >
        {task.text}
      </span>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <span
            aria-label={`Added by ${task.creator.name}`}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium leading-none ring-1 ring-border/60",
              avatarTone(task.creator.name),
            )}
          >
            {initialsOf(task.creator.name)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Added by {task.creator.name}</TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete task"
        className="task-delete shrink-0 rounded-md p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive sm:p-1.5"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
