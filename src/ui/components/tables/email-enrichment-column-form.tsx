import { useMemo, useState } from "react";
import {
  EMAIL_INPUT_FIELDS,
  EMAIL_PROVIDER_LABELS,
  EMAIL_PROVIDERS,
  emailEnrichmentColumnCreateSchema,
  type ColumnResponse,
  type EmailEnrichmentConfig,
  type EmailInputFieldKey,
  type EmailProvider,
} from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { DrawerFooter } from "@/ui/components/ui/drawer";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  SquareLock01Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

type ProviderDraft = {
  id: EmailProvider;
  enabled: boolean;
};

type EmailMappings = Record<EmailInputFieldKey, string>;

function emptyMappings(): EmailMappings {
  return {
    first_name_column_id: "",
    last_name_column_id: "",
    linkedin_column_id: "",
    company_name_column_id: "",
    company_domain_column_id: "",
  };
}

function providersFromConfig(config: EmailEnrichmentConfig | null): ProviderDraft[] {
  if (!config) {
    return EMAIL_PROVIDERS.map((id) => ({ id, enabled: true }));
  }
  const seen = new Set<EmailProvider>();
  const ordered: ProviderDraft[] = [];
  for (const id of config.providers) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    ordered.push({ id, enabled: true });
  }
  for (const id of EMAIL_PROVIDERS) {
    if (!seen.has(id)) {
      ordered.push({ id, enabled: false });
    }
  }
  return ordered;
}

function mappingsFromConfig(config: EmailEnrichmentConfig | null): EmailMappings {
  if (!config) {
    return emptyMappings();
  }
  return {
    first_name_column_id: config.first_name_column_id,
    last_name_column_id: config.last_name_column_id,
    linkedin_column_id: config.linkedin_column_id,
    company_name_column_id: config.company_name_column_id,
    company_domain_column_id: config.company_domain_column_id,
  };
}

export type EmailEnrichmentColumnFormProps = {
  columns: ColumnResponse[];
  excludeColumnIds?: string[];
  initialName?: string;
  initialConfig?: EmailEnrichmentConfig | null;
  acceptCatchallLocked?: boolean;
  idPrefix?: string;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (input: { name: string; email_enrichment: EmailEnrichmentConfig }) => void;
  onCancel: () => void;
};

export function EmailEnrichmentColumnForm({
  columns,
  excludeColumnIds = [],
  initialName = "Work email",
  initialConfig = null,
  acceptCatchallLocked = false,
  idPrefix = "email-enrichment",
  pending,
  error,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
}: EmailEnrichmentColumnFormProps) {
  const excluded = useMemo(() => new Set(excludeColumnIds), [excludeColumnIds]);
  const [name, setName] = useState(initialName);
  const [providers, setProviders] = useState<ProviderDraft[]>(() => providersFromConfig(initialConfig));
  const [emailMappings, setEmailMappings] = useState<EmailMappings>(() => mappingsFromConfig(initialConfig));
  const [acceptCatchall, setAcceptCatchall] = useState(initialConfig?.accept_catchall ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const textColumns = useMemo(
    () => columns.filter((column) => column.type === "text" && !excluded.has(column.id)),
    [columns, excluded],
  );
  const enabledProviderCount = providers.filter((provider) => provider.enabled).length;
  const hasEnoughTextColumns = textColumns.length >= EMAIL_INPUT_FIELDS.length;

  function toggleProvider(id: EmailProvider, enabled: boolean) {
    setProviders((current) => {
      const next = current.map((provider) => (provider.id === id ? { ...provider, enabled } : provider));
      if (!next.some((provider) => provider.enabled)) {
        return current;
      }
      return next;
    });
  }

  function moveProvider(index: number, direction: -1 | 1) {
    setProviders((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) {
        return current;
      }
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const parsed = emailEnrichmentColumnCreateSchema.safeParse({
      name,
      type: "email_enrichment",
      email_enrichment: {
        providers: providers.filter((provider) => provider.enabled).map((provider) => provider.id),
        validator: "millionverifier",
        accept_catchall: acceptCatchallLocked ? true : acceptCatchall,
        ...emailMappings,
      },
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid email enrichment column");
      return;
    }

    onSubmit({ name: parsed.data.name, email_enrichment: parsed.data.email_enrichment });
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
            placeholder="Work email"
            required
            autoFocus
            className="h-9 rounded-lg px-3 text-sm"
          />
        </Field>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Providers</p>
          {providers.map((provider, index) => (
            <div
              key={provider.id}
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2"
            >
              <Checkbox
                checked={provider.enabled}
                disabled={pending || (provider.enabled && enabledProviderCount === 1)}
                aria-label={`Use ${EMAIL_PROVIDER_LABELS[provider.id]}`}
                onCheckedChange={(next) => {
                  if (typeof next === "boolean") {
                    toggleProvider(provider.id, next);
                  }
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {EMAIL_PROVIDER_LABELS[provider.id]}
              </span>
              <div className="flex shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${EMAIL_PROVIDER_LABELS[provider.id]} up`}
                  disabled={index === 0 || pending}
                  onClick={() => moveProvider(index, -1)}
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${EMAIL_PROVIDER_LABELS[provider.id]} down`}
                  disabled={index === providers.length - 1 || pending}
                  onClick={() => moveProvider(index, 1)}
                >
                  <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                </Button>
              </div>
            </div>
          ))}
          <FieldDescription>
            Order is the waterfall sequence. At least one provider must stay on.
          </FieldDescription>
        </div>
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
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
              acceptCatchallLocked
                ? "border-border/70 bg-muted/30"
                : "border-border/70 bg-background"
            }`}
          >
            <Checkbox
              checked={acceptCatchallLocked || acceptCatchall}
              disabled={pending || acceptCatchallLocked}
              aria-label="Treat catch-all as valid"
              onCheckedChange={(next) => {
                if (typeof next === "boolean") {
                  setAcceptCatchall(next);
                }
              }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">Treat catch-all as valid</span>
            {acceptCatchallLocked ? (
              <HugeiconsIcon
                icon={SquareLock01Icon}
                strokeWidth={2}
                className="size-4 shrink-0 text-muted-foreground"
              />
            ) : null}
          </div>
          <FieldDescription>
            {acceptCatchallLocked
              ? "Catch-all emails are already treated as valid. This cannot be turned off."
              : "Use the first catch-all only if no fully verified email is found. Turning this on later updates existing Not found rows from stored results. It cannot be turned off."}
          </FieldDescription>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">Input columns</p>
          {EMAIL_INPUT_FIELDS.map((field) => (
            <Field key={field.key}>
              <FieldLabel htmlFor={`${idPrefix}-${field.key}`} className="text-xs text-muted-foreground">
                {field.label}
              </FieldLabel>
              <div className="relative">
                <select
                  id={`${idPrefix}-${field.key}`}
                  value={emailMappings[field.key]}
                  disabled={pending || !hasEnoughTextColumns}
                  onChange={(event) =>
                    setEmailMappings((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  className={`${nativeSelectClass} w-full`}
                >
                  <option value="">Select a text column</option>
                  {textColumns.map((column) => (
                    <option
                      key={column.id}
                      value={column.id}
                      disabled={
                        column.id !== emailMappings[field.key] &&
                        Object.values(emailMappings).includes(column.id)
                      }
                    >
                      {column.name}
                    </option>
                  ))}
                </select>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </Field>
          ))}
          {hasEnoughTextColumns ? (
            <FieldDescription>Each field must map to a different text column.</FieldDescription>
          ) : (
            <FieldDescription>
              Add at least {EMAIL_INPUT_FIELDS.length} text columns before creating this enrichment.
            </FieldDescription>
          )}
        </div>
        {displayError ? <p className="text-xs text-destructive">{displayError}</p> : null}
      </FieldGroup>
      <DrawerFooter className="flex-row justify-end">
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !hasEnoughTextColumns || enabledProviderCount === 0}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </DrawerFooter>
    </form>
  );
}
