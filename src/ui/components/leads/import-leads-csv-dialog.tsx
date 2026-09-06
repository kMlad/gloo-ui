import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LEAD_CSV_FIELD_GROUPS,
  LEAD_CSV_FIELDS,
  emptyLeadCsvMapping,
  importLeadsCsv,
  leadKeys,
  mappingFromSuggestion,
  previewLeadsCsv,
  type LeadCsvFieldId,
  type LeadCsvFieldMapping,
  type LeadCsvImportResult,
  type LeadCsvMappingPayload,
  type LeadCsvPreview,
} from "@/lib/leads";
import { mutationErrorMessage } from "@/lib/tables";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
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
import { Separator } from "@/ui/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

type ImportStep = "file" | "map" | "done";

type ImportLeadsCsvDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function mappingPayload(
  mapping: LeadCsvFieldMapping,
  customProperties: string[],
): LeadCsvMappingPayload {
  const payload: LeadCsvMappingPayload = {};
  for (const field of LEAD_CSV_FIELDS) {
    const header = mapping[field.id];
    if (header) {
      payload[field.id] = header;
    }
  }
  if (customProperties.length > 0) {
    payload.custom_properties = customProperties;
  }
  return payload;
}

function importResultMessage(result: LeadCsvImportResult) {
  const parts = [
    `${result.created_count} created`,
    `${result.skipped_duplicate_count} already in Gloo`,
    `${result.skipped_invalid_count} missing email and phone`,
  ];
  return parts.join(", ");
}

export function ImportLeadsCsvDialog({ open, onOpenChange }: ImportLeadsCsvDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ImportStep>("file");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LeadCsvPreview | null>(null);
  const [mapping, setMapping] = useState<LeadCsvFieldMapping>(emptyLeadCsvMapping);
  const [customProperties, setCustomProperties] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadCsvImportResult | null>(null);

  const previewCsv = useMutation({
    mutationFn: (csv: File) => previewLeadsCsv(csv),
    onSuccess: (data) => {
      setPreview(data);
      setMapping(mappingFromSuggestion(data.suggested_mapping));
      setCustomProperties([]);
      setStep("map");
    },
  });

  const importCsv = useMutation({
    mutationFn: ({ csv, payload }: { csv: File; payload: LeadCsvMappingPayload }) =>
      importLeadsCsv(csv, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: leadKeys.all });
      setResult(data);
      setStep("done");
    },
  });

  const mappedHeaders = useMemo(() => {
    return new Set(
      LEAD_CSV_FIELDS.map((field) => mapping[field.id]).filter((header): header is string =>
        Boolean(header),
      ),
    );
  }, [mapping]);

  const extraHeaders = preview?.headers.filter((header) => !mappedHeaders.has(header)) ?? [];
  const canImport = Boolean(mapping.email || mapping.phone);

  function resetForm() {
    setStep("file");
    setFile(null);
    setPreview(null);
    setMapping(emptyLeadCsvMapping());
    setCustomProperties([]);
    setValidationError(null);
    setResult(null);
    previewCsv.reset();
    importCsv.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && (previewCsv.isPending || importCsv.isPending)) {
      return;
    }
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleFieldChange(field: LeadCsvFieldId, header: string) {
    const nextHeader = header || null;
    setMapping((current) => ({ ...current, [field]: nextHeader }));
    if (nextHeader) {
      setCustomProperties((current) => current.filter((item) => item !== nextHeader));
    }
  }

  function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    previewCsv.reset();
    if (!file) {
      setValidationError("Choose a CSV file to import");
      return;
    }
    previewCsv.mutate(file);
  }

  function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    importCsv.reset();
    if (!file) {
      setValidationError("Choose a CSV file to import");
      return;
    }
    if (!canImport) {
      setValidationError("Map an email or phone column");
      return;
    }
    importCsv.mutate({
      csv: file,
      payload: mappingPayload(mapping, customProperties),
    });
  }

  const error =
    validationError ||
    (previewCsv.isError ? mutationErrorMessage(previewCsv.error, "Failed to read CSV") : "") ||
    (importCsv.isError ? mutationErrorMessage(importCsv.error, "Failed to import CSV") : "");

  const pending = previewCsv.isPending || importCsv.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            {step === "file"
              ? "Upload a CSV, then map columns to lead fields. Email or phone is required."
              : step === "map"
                ? `${preview?.row_count ?? 0} row${preview?.row_count === 1 ? "" : "s"} ready to map.`
                : "Import finished."}
          </DialogDescription>
        </DialogHeader>

        {step === "file" ? (
          <form onSubmit={handlePreview} className="flex flex-col gap-4">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="lead-import-file" className="text-xs text-muted-foreground">
                  CSV file
                </FieldLabel>
                <Input
                  id="lead-import-file"
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
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {previewCsv.isPending ? "Reading…" : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === "map" && preview ? (
          <form
            onSubmit={handleImport}
            className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
          >
            <div className="flex flex-col gap-4">
              {LEAD_CSV_FIELD_GROUPS.map((group, groupIndex) => (
                <div key={group.id} className="flex flex-col gap-2">
                  {groupIndex > 0 ? <Separator className="mb-2" /> : null}
                  <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                    <legend className="text-xs font-medium text-foreground">{group.label}</legend>
                    {group.fields.map((field) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3"
                      >
                        <label
                          htmlFor={`lead-map-${field.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          {field.label}
                          {field.id === "email" || field.id === "phone" ? " *" : ""}
                        </label>
                        <div className="relative">
                          <select
                            id={`lead-map-${field.id}`}
                            className={cn(nativeSelectClass, "w-full")}
                            value={mapping[field.id] ?? ""}
                            onChange={(event) => handleFieldChange(field.id, event.target.value)}
                          >
                            <option value="">Skip</option>
                            {preview.headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                          <HugeiconsIcon
                            icon={UnfoldMoreIcon}
                            strokeWidth={2}
                            className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                          />
                        </div>
                      </div>
                    ))}
                  </fieldset>
                </div>
              ))}
            </div>

            {extraHeaders.length > 0 ? (
              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="text-xs text-muted-foreground">
                  Save extra columns as custom properties
                </legend>
                <div className="flex flex-col gap-2">
                  {extraHeaders.map((header) => (
                    <label
                      key={header}
                      className="inline-flex items-center gap-2 text-sm text-foreground"
                    >
                      <Checkbox
                        checked={customProperties.includes(header)}
                        onCheckedChange={(checked) => {
                          setCustomProperties((current) =>
                            checked === true
                              ? [...current, header]
                              : current.filter((item) => item !== header),
                          );
                        }}
                      />
                      {header}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {preview.preview_rows.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Preview</p>
                <div className="overflow-x-auto rounded-lg border border-border/70">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/70">
                        {LEAD_CSV_FIELDS.filter((field) => mapping[field.id]).map((field) => (
                          <th
                            key={field.id}
                            className="px-3 py-2 font-medium text-muted-foreground"
                          >
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview_rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-border/60 last:border-0">
                          {LEAD_CSV_FIELDS.filter((field) => mapping[field.id]).map((field) => {
                            const header = mapping[field.id];
                            const index = header ? preview.headers.indexOf(header) : -1;
                            const value = index >= 0 ? row[index] : "";
                            return (
                              <td key={field.id} className="px-3 py-2 text-foreground">
                                {value || "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setStep("file");
                  setPreview(null);
                  setValidationError(null);
                  importCsv.reset();
                }}
              >
                Back
              </Button>
              <Button type="submit" disabled={pending || !canImport}>
                {importCsv.isPending ? "Importing…" : "Import"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === "done" && result ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">{importResultMessage(result)}</p>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
