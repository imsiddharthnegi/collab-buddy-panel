import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { CreateListDialog } from "@/components/create-list-dialog";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/")({
  component: Index,
});

type DbList = Tables<"lists">;

type ListWithMeta = DbList & {
  isOwner: boolean;
  taskCount?: number;
};

function Index() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [lists, setLists] = useState<ListWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  // Fetch user's lists (owned + collaborating)
  useEffect(() => {
    const fetchLists = async () => {
      if (!session?.user) {
        setLists([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userId = session.user.id;

      // Fetch lists the user created
      const { data: ownedLists, error: ownedError } = await supabase
        .from("lists")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (ownedError) {
        console.error("Error fetching owned lists:", ownedError);
      }

      // Fetch lists the user is a collaborator on
      const { data: collabData, error: collabError } = await supabase
        .from("list_collaborators")
        .select("list_id")
        .eq("user_id", userId);

      if (collabError) {
        console.error("Error fetching collaborations:", collabError);
      }

      let collabLists: DbList[] = [];
      if (collabData && collabData.length > 0) {
        const listIds = collabData.map((c) => c.list_id);
        const { data: lists, error: listsError } = await supabase
          .from("lists")
          .select("*")
          .in("id", listIds)
          .order("created_at", { ascending: false });

        if (listsError) {
          console.error("Error fetching collab lists:", listsError);
        } else if (lists) {
          collabLists = lists;
        }
      }

      // Combine and dedupe
      const allLists: ListWithMeta[] = [
        ...(ownedLists ?? []).map((l) => ({ ...l, isOwner: true })),
        ...collabLists.map((l) => ({ ...l, isOwner: false })),
      ];

      // Remove duplicates (in case user owns a list they're also marked as collaborator on)
      const seen = new Set<string>();
      const uniqueLists = allLists.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });

      setLists(uniqueLists);
      setLoading(false);
    };

    fetchLists();
  }, [session]);

  const userName =
    (session?.user.user_metadata?.name as string | undefined) ??
    session?.user.email ??
    null;

  const handleListCreated = (listId: string) => {
    navigate({ to: "/list/$id", params: { id: listId } });
  };

  return (
    <>
      {session ? (
        <AppHeader />
      ) : (
        <div className="absolute right-6 top-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ mode: "login" }}>
              Sign in
            </Link>
          </Button>
        </div>
      )}
      <div className="flex min-h-screen flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-2xl">
          {session ? (
            <>
              <header className="mb-8 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Welcome back{userName ? `, ${userName.split("@")[0]}` : ""}
                </p>
                <h1 className="text-3xl font-bold tracking-tight">Your Lists</h1>
              </header>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border text-muted-foreground">
                    <Plus className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <p className="mt-6 text-base text-muted-foreground">
                    Create your first list to start collaborating.
                  </p>
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="auth-primary mt-8 h-11 px-5"
                  >
                    Create your first list
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {lists.length} list{lists.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                      onClick={() => setCreateOpen(true)}
                      size="sm"
                      className="auth-primary gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      New list
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {lists.map((list) => (
                      <li key={list.id}>
                        <Link
                          to="/list/$id"
                          params={{ id: list.id }}
                          className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-foreground/20 hover:bg-accent/50"
                        >
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate font-medium text-foreground">
                              {list.title}
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {list.isOwner ? "Your list" : "Shared with you"}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Collaborative Task Lists
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to start collaborating on shared lists.
                </p>
              </div>
              <Button
                size="lg"
                className="auth-primary mt-8"
                onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
              >
                Get started
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleListCreated}
      />
    </>
  );
}
