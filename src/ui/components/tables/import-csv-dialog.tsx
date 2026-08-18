import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importTableCsv, mutationErrorMessage, tableKeys } from "@/lib/tables";
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

type ImportCsvDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (tableId: string) => void;
};

export function ImportCsvDialog({ open, onOpenChange, onImported }: ImportCsvDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const importCsv = useMutation({
    mutationFn: ({ csv, tableName }: { csv: File; tableName?: string }) =>
      importTableCsv(csv, tableName),
    onSuccess: async (table) => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      resetForm();
      onImported(table.id);
    },
  });

  function resetForm() {
    setName("");
    setFile(null);
    setValidationError(null);
    importCsv.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && importCsv.isPending) {
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
    importCsv.reset();

    if (!file) {
      setValidationError("Choose a CSV file to import");
      return;
    }

    importCsv.mutate({
      csv: file,
      tableName: name.trim() || undefined,
    });
  }

  const error =
    validationError ??
    mutationErrorMessage(importCsv.error, importCsv.isError ? "Failed to import CSV" : "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!importCsv.isPending}>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV to create a table. The first row is used as column names.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="import-name" className="text-xs text-muted-foreground">
                Table name (optional)
              </FieldLabel>
              <Input
                id="import-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Imported contacts"
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="import-file" className="text-xs text-muted-foreground">
                CSV file
              </FieldLabel>
              <Input
                id="import-file"
                type="file"
                accept=".csv,text/csv"
                className="h-9 rounded-lg px-3 text-sm"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={importCsv.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={importCsv.isPending}>
              {importCsv.isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
