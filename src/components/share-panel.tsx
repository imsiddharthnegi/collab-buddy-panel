import { useState } from "react";
import { Check, Copy, Link2, LogOut, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type Collaborator = {
  id: string;
  name: string;
  color?: string;
};

type SharePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listTitle: string;
  shareUrl: string;
  collaborators: Collaborator[];
  isCreator?: boolean;
  onLeave?: () => void;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const avatarPalette = [
  "bg-chart-1 text-white",
  "bg-chart-2 text-white",
  "bg-chart-3 text-white",
  "bg-chart-4 text-white",
  "bg-chart-5 text-white",
];

export function SharePanel({
  open,
  onOpenChange,
  listTitle,
  shareUrl,
  collaborators,
  isCreator = false,
  onLeave,
}: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-6">
        <SheetHeader className="space-y-1 px-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Share list
          </p>
          <SheetTitle className="text-2xl font-semibold leading-tight">
            {listTitle}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Share this list with collaborators
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Shareable link
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 p-1.5 pl-3">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 truncate bg-transparent text-sm text-foreground outline-none"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCopy}
              className={cn(
                "h-8 gap-1.5 rounded-md px-3 text-xs font-medium shadow-sm transition-all active:scale-95",
                copied && "bg-chart-2 hover:bg-chart-2",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Anyone with the link can view and edit this list.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Collaborators
            </h3>
            <span className="text-xs text-muted-foreground">
              {collaborators.length}
            </span>
          </div>

          {collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one has joined yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {collaborators.map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-md py-1.5"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={cn(
                        "text-xs font-medium",
                        avatarPalette[i % avatarPalette.length],
                      )}
                    >
                      {initialsOf(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{c.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto">
          {!isCreator && (
            <Button
              variant="outline"
              className="w-full gap-2 text-destructive hover:text-destructive"
              onClick={onLeave}
            >
              <LogOut className="h-4 w-4" />
              Leave list
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
