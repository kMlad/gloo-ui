import { useMemo, useState } from "react";
import {
  emailValidationColumnCreateSchema,
  type ColumnResponse,
  type EmailValidationConfig,
} from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { DrawerFooter } from "@/ui/components/ui/drawer";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { SquareLock01Icon } from "@hugeicons/core-free-icons";

export type EmailValidationColumnFormProps = {
  columns: ColumnResponse[];
  excludeColumnIds?: string[];
  initialName?: string;
  initialConfig?: EmailValidationConfig | null;
  idPrefix?: string;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (input: { name: string; email_validation: EmailValidationConfig }) => void;
  onCancel: () => void;
};

export function EmailValidationColumnForm({
  columns,
  excludeColumnIds = [],
  initialName = "Email valid",
  initialConfig = null,
  idPrefix = "email-validation",
  pending,
  error,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
}: EmailValidationColumnFormProps) {
  const excluded = useMemo(() => new Set(excludeColumnIds), [excludeColumnIds]);
  const [name, setName] = useState(initialName);
  const [emailColumnId, setEmailColumnId] = useState(initialConfig?.email_column_id ?? "");
  const [acceptCatchall, setAcceptCatchall] = useState(initialConfig?.accept_catchall ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const textColumns = useMemo(
    () => columns.filter((column) => column.type === "text" && !excluded.has(column.id)),
    [columns, excluded],
  );
  const hasTextColumn = textColumns.length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const parsed = emailValidationColumnCreateSchema.safeParse({
      name,
      type: "email_validation",
      email_validation: {
        email_column_id: emailColumnId,
        validator: "millionverifier",
        accept_catchall: acceptCatchall,
      },
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid email validation column");
      return;
    }

    onSubmit({ name: parsed.data.name, email_validation: parsed.data.email_validation });
  }

  const displayError = validationError ?? error;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <FieldGroup className="flex-1 gap-4 overflow-y-auto p-4">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-name`} className="text-xs text-muted-foreground">
            Name
          </FieldLabel>
          <Input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Email valid"
            required
            autoFocus
            className="h-9 rounded-lg px-3 text-sm"
          />
        </Field>
        <Field>
          <FieldLabel
            htmlFor={`${idPrefix}-email-column`}
            className="text-xs text-muted-foreground"
          >
            Email column
          </FieldLabel>
          <Select
            value={emailColumnId || null}
            disabled={pending || !hasTextColumn}
            onValueChange={(value) => setEmailColumnId(value ?? "")}
          >
            <SelectTrigger id={`${idPrefix}-email-column`} size="lg" className="w-full">
              <SelectValue placeholder="Select a text column" />
            </SelectTrigger>
            <SelectContent>
              {textColumns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasTextColumn ? (
            <FieldDescription>
              MillionVerifier will check the address in this column.
            </FieldDescription>
          ) : (
            <FieldDescription>
              Add a text column with emails before creating this validation.
            </FieldDescription>
          )}
        </Field>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Verification</p>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
            <Checkbox checked disabled aria-label="MillionVerifier is required" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">MillionVerifier</span>
            <HugeiconsIcon
              icon={SquareLock01Icon}
              strokeWidth={2}
              className="size-4 shrink-0 text-muted-foreground"
            />
          </div>
          <FieldDescription>Email verification is locked to MillionVerifier.</FieldDescription>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2">
            <Checkbox
              checked={acceptCatchall}
              disabled={pending}
              aria-label="Treat catch-all as valid"
              onCheckedChange={(next) => {
                if (typeof next === "boolean") {
                  setAcceptCatchall(next);
                }
              }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              Treat catch-all as valid
            </span>
          </div>
          <FieldDescription>
            Catch-all domains are invalid unless this is on. Changing it later reclassifies existing
            results without calling MillionVerifier again.
          </FieldDescription>
        </div>
        {displayError ? <p className="text-xs text-destructive">{displayError}</p> : null}
      </FieldGroup>
      <DrawerFooter className="flex-row justify-end">
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !hasTextColumn}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </DrawerFooter>
    </form>
  );
}
