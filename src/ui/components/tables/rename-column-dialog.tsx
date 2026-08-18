import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  mutationErrorMessage,
  tableKeys,
  updateColumn,
  type ColumnResponse,
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

type RenameColumnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  column: ColumnResponse | null;
};

export function RenameColumnDialog({
  open,
  onOpenChange,
  tableId,
  column,
}: RenameColumnDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(column?.name ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(column?.name ?? "");
      setValidationError(null);
    }
  }, [column?.name, open]);

  const rename = useMutation({
    mutationFn: ({ columnId, nextName }: { columnId: string; nextName: string }) =>
      updateColumn(tableId, columnId, { name: nextName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
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
    if (!column) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError("Column name is required");
      return;
    }
    rename.mutate({ columnId: column.id, nextName: trimmed });
  }

  const error =
    validationError ??
    mutationErrorMessage(rename.error, rename.isError ? "Failed to rename column" : "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!rename.isPending}>
        <DialogHeader>
          <DialogTitle>Rename column</DialogTitle>
          <DialogDescription>Change the display name of this column.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rename-column-name" className="text-xs text-muted-foreground">
                Name
              </FieldLabel>
              <Input
                id="rename-column-name"
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
            <Button type="submit" disabled={rename.isPending || !column}>
              {rename.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
