import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTable,
  primitiveColumnTypeSchema,
  mutationErrorMessage,
  tableCreateSchema,
  tableKeys,
  type PrimitiveColumnType,
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
import { Add01Icon, Cancel01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";

type DraftColumn = {
  key: string;
  name: string;
  type: PrimitiveColumnType;
};

type CreateTableDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (tableId: string) => void;
};

function nextKey() {
  return crypto.randomUUID();
}

export function CreateTableDialog({ open, onOpenChange, onCreated }: CreateTableDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [columns, setColumns] = useState<DraftColumn[]>([
    { key: "default", name: "Name", type: "text" },
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: createTable,
    onSuccess: async (table) => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      resetForm();
      onCreated(table.id);
    },
  });

  function resetForm() {
    setName("");
    setColumns([{ key: nextKey(), name: "Name", type: "text" }]);
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

    const parsed = tableCreateSchema.safeParse({
      name,
      columns: columns
        .map((column) => ({ name: column.name, type: column.type }))
        .filter((column) => column.name.trim().length > 0),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid table details");
      return;
    }

    create.mutate(parsed.data);
  }

  const error = validationError ?? mutationErrorMessage(create.error, create.isError ? "Failed to create table" : "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!create.isPending}>
        <DialogHeader>
          <DialogTitle>New table</DialogTitle>
          <DialogDescription>Give it a name and optional starting columns.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="table-name" className="text-xs text-muted-foreground">
                Name
              </FieldLabel>
              <Input
                id="table-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Outreach list"
                required
                autoFocus
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Columns</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setColumns((current) => [...current, { key: nextKey(), name: "", type: "text" }])
                  }
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  Add column
                </Button>
              </div>
              {columns.map((column) => (
                <div key={column.key} className="flex items-center gap-2">
                  <Input
                    value={column.name}
                    onChange={(event) =>
                      setColumns((current) =>
                        current.map((entry) =>
                          entry.key === column.key ? { ...entry, name: event.target.value } : entry,
                        ),
                      )
                    }
                    placeholder="Column name"
                    className="h-9 rounded-lg px-3 text-sm"
                  />
                  <div className="relative shrink-0">
                    <select
                      value={column.type}
                      onChange={(event) => {
                        const parsed = primitiveColumnTypeSchema.safeParse(event.target.value);
                        if (!parsed.success) {
                          return;
                        }
                        setColumns((current) =>
                          current.map((entry) =>
                            entry.key === column.key ? { ...entry, type: parsed.data } : entry,
                          ),
                        );
                      }}
                      className="h-9 w-28 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                    >
                      <option value="text">Text</option>
                      <option value="boolean">Boolean</option>
                    </select>
                    <HugeiconsIcon
                      icon={UnfoldMoreIcon}
                      strokeWidth={2}
                      className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove column"
                    disabled={columns.length === 1}
                    onClick={() =>
                      setColumns((current) => current.filter((entry) => entry.key !== column.key))
                    }
                  >
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                  </Button>
                </div>
              ))}
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={create.isPending} onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
