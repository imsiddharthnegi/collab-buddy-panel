import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharePanel, type Collaborator } from "@/components/share-panel";

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
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Weekend Trip Plans
          </h1>
          <p className="text-sm text-muted-foreground">
            Share your list with friends to collaborate together.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share list
        </Button>
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
    </div>
  );
}
