import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

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
      { id: crypto.randomUUID(), text, completed: false },
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
    <div className="min-h-screen px-6 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <header className="mt-8 mb-12 space-y-2">
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Shared list
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Weekend Trip Plans
          </h1>
        </header>

        {isEmpty ? (
          <EmptyState onAdd={() => inputRef.current?.focus()} />
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

        <div className="mt-12">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 pl-4 transition focus-within:border-foreground/40">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
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
              className="auth-primary h-9 px-4"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
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
  return (
    <li className="task-row group flex items-center gap-4 rounded-lg px-4 py-3">
      <Checkbox
        checked={task.completed}
        onCheckedChange={onToggle}
        className="h-5 w-5 rounded-full border-muted-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground"
        aria-label={task.completed ? "Mark as active" : "Mark as completed"}
      />
      <span
        onClick={onToggle}
        className={cn(
          "flex-1 cursor-pointer select-none text-base leading-relaxed",
          task.completed
            ? "text-muted-foreground line-through"
            : "text-foreground",
        )}
      >
        {task.text}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete task"
        className="task-delete rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
