import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$slug")({
  component: JoinList,
});

function JoinList() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listTitle, setListTitle] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const checkAndJoin = async () => {
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session?.user) {
        // Redirect to auth with return URL
        toast.info("Please sign in to join this list");
        navigate({ 
          to: "/auth", 
          search: { mode: "login", returnTo: `/join/${slug}` } 
        });
        return;
      }

      const userId = sessionData.session.user.id;

      // Find the list by share_slug
      const { data: list, error: listError } = await supabase
        .from("lists")
        .select("id, title, created_by")
        .eq("share_slug", slug)
        .single();

      if (listError || !list) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setListTitle(list.title);
      setListId(list.id);

      // Check if user is the creator
      if (list.created_by === userId) {
        toast.info("You created this list");
        navigate({ to: "/list/$id", params: { id: list.id } });
        return;
      }

      // Check if already a collaborator
      const { data: existing } = await supabase
        .from("list_collaborators")
        .select("list_id")
        .eq("list_id", list.id)
        .eq("user_id", userId)
        .single();

      if (existing) {
        toast.info("You're already a collaborator on this list");
        navigate({ to: "/list/$id", params: { id: list.id } });
        return;
      }

      setLoading(false);
    };

    checkAndJoin();
  }, [slug, navigate]);

  const handleJoin = async () => {
    if (!listId) return;

    setJoining(true);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      toast.error("Please sign in to join");
      return;
    }

    const { error } = await supabase.from("list_collaborators").insert({
      list_id: listId,
      user_id: sessionData.session.user.id,
    });

    if (error) {
      console.error("Error joining list:", error);
      toast.error("Failed to join list");
      setJoining(false);
      return;
    }

    toast.success("You joined the list!");
    navigate({ to: "/list/$id", params: { id: listId } });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-muted-foreground">{error}</p>
        <Button asChild variant="outline">
          <a href="/">Go home</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          You&apos;ve been invited to join
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{listTitle}</h1>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          Decline
        </Button>
        <Button 
          onClick={handleJoin} 
          disabled={joining}
          className="auth-primary"
        >
          {joining ? "Joining..." : "Join list"}
        </Button>
      </div>
    </div>
  );
}
