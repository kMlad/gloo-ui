import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  mutationErrorMessage,
  tableKeys,
  tableUpdateSchema,
  updateTable,
} from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";

type RenameTableDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string | null;
  currentName: string;
};

export function RenameTableDialog({
  open,
  onOpenChange,
  tableId,
  currentName,
}: RenameTableDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setValidationError(null);
    }
  }, [currentName, open]);

  const rename = useMutation({
    mutationFn: ({ id, nextName }: { id: string; nextName: string }) =>
      updateTable(id, { name: nextName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      onOpenChange(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && rename.isPending) {
      return;
    }
    if (!nextOpen) {
      setValidationError(null);
      rename.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    rename.reset();

    if (!tableId) {
      return;
    }

    const parsed = tableUpdateSchema.safeParse({ name });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid table name");
      return;
    }

    rename.mutate({ id: tableId, nextName: parsed.data.name });
  }

  const error =
    validationError ?? mutationErrorMessage(rename.error, rename.isError ? "Failed to rename table" : "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!rename.isPending}>
        <DialogHeader>
          <DialogTitle>Rename table</DialogTitle>
          <DialogDescription>Update the name of this table.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rename-table-name" className="text-xs text-muted-foreground">
                Name
              </FieldLabel>
              <Input
                id="rename-table-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={rename.isPending} onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={rename.isPending || !tableId}>
              {rename.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
