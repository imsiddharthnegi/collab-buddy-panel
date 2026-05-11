import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, LogOut, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { SharePanel, type Collaborator } from "@/components/share-panel";
import { CreateListDialog } from "@/components/create-list-dialog";

export const Route = createFileRoute("/")({
  component: Index,
});

const collaborators: Collaborator[] = [
  { id: "1", name: "Alex Morgan" },
  { id: "2", name: "Priya Shah" },
  { id: "3", name: "Jordan Lee" },
  { id: "4", name: "Sam Rivera" },
];

function Index() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  const userName =
    (session?.user.user_metadata?.name as string | undefined) ??
    session?.user.email ??
    null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="absolute right-6 top-6">
        {session ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth" search={{ mode: "login" }}>
              Sign in
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Weekend Trip Plans
          </h1>
          <p className="text-sm text-muted-foreground">
            {userName
              ? `Signed in as ${userName}. Share your list to collaborate.`
              : "Sign in to start collaborating on shared lists."}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          {session ? (
            <>
              <Button
                onClick={() => setCreateOpen(true)}
                size="lg"
                className="auth-primary gap-2"
              >
                <Plus className="h-4 w-4" />
                New list
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="auth-secondary gap-2"
              >
                <Link to="/list">Open list</Link>
              </Button>
              <Button
                onClick={() => setOpen(true)}
                size="lg"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="auth-primary"
              onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
            >
              Get started
            </Button>
          )}
        </div>
      </div>

      <SharePanel
        open={open}
        onOpenChange={setOpen}
        listTitle="Weekend Trip Plans"
        shareUrl="https://lists.app/share/weekend-trip-x8k2"
        collaborators={collaborators}
        isCreator={false}
        onLeave={() => setOpen(false)}
      />

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
