import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, Settings, Share2, DoorOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

type AppHeaderProps = {
  listTitle?: string;
  onShare?: () => void;
  onSettings?: () => void;
  onLeave?: () => void;
  showLeave?: boolean;
};

function initialsOf(name: string) {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export function AppHeader({
  listTitle,
  onShare,
  onSettings,
  onLeave,
  showLeave,
}: AppHeaderProps) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  const userName =
    (session?.user.user_metadata?.name as string | undefined) ??
    session?.user.email ??
    "Guest";
  const initials = initialsOf(userName);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid h-14 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="justify-self-start text-sm font-semibold tracking-tight text-foreground transition hover:text-foreground/80"
        >
          Lists
        </Link>

        {listTitle ? (
          <h1 className="min-w-0 justify-self-center truncate text-sm font-medium text-foreground/90">
            {listTitle}
          </h1>
        ) : (
          <span aria-hidden />
        )}

        <div className="justify-self-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="group inline-flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 outline-none ring-offset-background transition hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Open account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {userName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onShare && (
                <DropdownMenuItem onSelect={onShare}>
                  <Share2 className="h-4 w-4" />
                  Share list
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={onSettings}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {showLeave && (
                <DropdownMenuItem
                  onSelect={onLeave}
                  className="text-destructive focus:text-destructive"
                >
                  <DoorOpen className="h-4 w-4" />
                  Leave list
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async () => {
                  await supabase.auth.signOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
