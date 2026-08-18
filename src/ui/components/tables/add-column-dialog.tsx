import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addColumn,
  columnCreateSchema,
  columnTypeSchema,
  mutationErrorMessage,
  tableKeys,
  type ColumnType,
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
import { HugeiconsIcon } from "@hugeicons/react";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";

type AddColumnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
};

export function AddColumnDialog({ open, onOpenChange, tableId }: AddColumnDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [validationError, setValidationError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => addColumn(tableId, { name, type }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      resetForm();
      onOpenChange(false);
    },
  });

  function resetForm() {
    setName("");
    setType("text");
    setValidationError(null);
    create.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && create.isPending) {
      return;
    }
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    create.reset();

    const parsed = columnCreateSchema.safeParse({ name, type });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid column");
      return;
    }

    create.mutate();
  }

  const error =
    validationError ?? mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!create.isPending}>
        <DialogHeader>
          <DialogTitle>Add column</DialogTitle>
          <DialogDescription>Text or boolean. Column type cannot be changed later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="column-name" className="text-xs text-muted-foreground">
                Name
              </FieldLabel>
              <Input
                id="column-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Company"
                required
                autoFocus
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="column-type" className="text-xs text-muted-foreground">
                Type
              </FieldLabel>
              <div className="relative">
                <select
                  id="column-type"
                  value={type}
                  onChange={(event) => {
                    const parsed = columnTypeSchema.safeParse(event.target.value);
                    if (parsed.success) {
                      setType(parsed.data);
                    }
                  }}
                  className="h-9 w-full appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                >
                  <option value="text">Text</option>
                  <option value="boolean">Boolean</option>
                </select>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </Field>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={create.isPending} onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add column"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
