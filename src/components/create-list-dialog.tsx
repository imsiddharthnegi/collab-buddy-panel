import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
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
  onCreate?: (list: NewList) => void;
};

export function CreateListDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
  };

  const handleCreate = () => {
    const parsed = schema.safeParse({ name, description });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    onCreate?.(parsed.data);
    toast.success("List created", {
      description: "Ready to add tasks.",
    });
    reset();
    onOpenChange(false);
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
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            className="auth-primary h-10 px-5"
          >
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
