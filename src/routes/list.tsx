import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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

const LIST_TITLE = "Weekend Trip Plans";
const SHARE_URL = "https://lists.app/share/weekend-trip-x8k2";
const COLLABORATORS: Collaborator[] = [
  { id: "1", name: "Alex Morgan" },
  { id: "2", name: "Priya Shah" },
  { id: "3", name: "Jordan Lee" },
];

type Creator = {
  name: string;
};

type Task = {
  id: string;
  text: string;
  completed: boolean;
  creator: Creator;
};

const CURRENT_USER: Creator = { name: "You" };

function initialsOf(name: string) {
  if (name.toLowerCase() === "you") return "You";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Stable muted color per creator name
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

export const Route = createFileRoute("/list")({
  component: ListView,
  head: () => ({
    meta: [
      { title: "Weekend Trip Plans — Tasklist" },
      {
        name: "description",
        content: "Manage active and completed tasks in your shared list.",
      },
    ],
  }),
});

const initialTasks: Task[] = [];

function ListView() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);
  const isEmpty = tasks.length === 0;
  const showAddBar = !isEmpty || composing;

  const startComposing = () => {
    setComposing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const addTask = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, completed: false, creator: CURRENT_USER },
    ]);
    setDraft("");
  };

  const toggle = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );

  const remove = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  return (
    <TooltipProvider delayDuration={150}>
    <div className="flex min-h-screen flex-col px-4 py-8 pb-32 sm:px-6 sm:py-16 sm:pb-16">
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
            Shared list
          </p>
          <h1 className="break-words text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Weekend Trip Plans
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
