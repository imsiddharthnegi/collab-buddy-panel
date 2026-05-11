import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().trim().min(1, "Give your list a name").max(80),
  description: z.string().trim().max(280).optional(),
});

export type NewList = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (listId: string) => void;
};

export function CreateListDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
  };

  const handleCreate = async () => {
    const parsed = schema.safeParse({ name, description });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        toast.error("You must be signed in to create a list");
        return;
      }

      const { data, error } = await supabase
        .from("lists")
        .insert({
          title: parsed.data.name,
          created_by: session.session.user.id,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating list:", error);
        toast.error("Failed to create list", {
          description: error.message,
        });
        return;
      }

      toast.success("List created", {
        description: "Ready to add tasks.",
      });
      
      reset();
      onOpenChange(false);
      onCreated?.(data.id);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="create-list-dialog sm:max-w-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            New list
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Give your list a name to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="list-name" className="text-sm text-foreground/80">
              Name
            </Label>
            <Input
              id="list-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Weekend trip plans"
              maxLength={80}
              className="auth-input h-14 text-lg"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="list-description"
              className="text-sm text-foreground/80"
            >
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this list about?"
              maxLength={280}
              rows={3}
              className="auth-input resize-none py-3 text-base leading-relaxed"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            className="auth-primary h-10 px-5"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
