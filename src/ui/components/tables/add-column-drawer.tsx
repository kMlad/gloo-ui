import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addColumn,
  isComputedColumnType,
  sheriffColumnCreateSchema,
  sheriffExpandRequestSchema,
  expandSheriffPrompt,
  isTableResponse,
  mutationErrorMessage,
  primitiveColumnCreateSchema,
  primitiveColumnTypeSchema,
  tableKeys,
  type ColumnResponse,
  type PrimitiveColumnType,
} from "@/lib/tables";
import { EmailEnrichmentColumnForm } from "@/ui/components/tables/email-enrichment-column-form";
import { EmailValidationColumnForm } from "@/ui/components/tables/email-validation-column-form";
import { Button } from "@/ui/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/ui/components/ui/drawer";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  MailSearch01Icon,
  MailValidation01Icon,
  Sheriff01Icon,
  TextFontIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

const textareaClass =
  "min-h-40 w-full resize-y rounded-lg border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

type AddColumnDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  columns: ColumnResponse[];
};

type SlashMention = {
  start: number;
  query: string;
};

function slashMentionAt(text: string, cursor: number): SlashMention | null {
  const before = text.slice(0, cursor);
  const match = /(?:^|[\s])(\/([^\s{]*))$/.exec(before);
  if (!match) {
    return null;
  }
  return { start: cursor - match[1].length, query: match[2] };
}

type DrawerView = "picker" | "regular" | "sheriff" | "email_enrichment" | "email_validation";

type DraftOutput = {
  id: string;
  key: string;
  type: PrimitiveColumnType;
};

function nextId() {
  return crypto.randomUUID();
}

function emptyOutput(): DraftOutput {
  return { id: nextId(), key: "", type: "text" };
}

export function AddColumnDrawer({ open, onOpenChange, tableId, columns }: AddColumnDrawerProps) {
  const queryClient = useQueryClient();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const [view, setView] = useState<DrawerView>("picker");
  const [regularName, setRegularName] = useState("");
  const [regularType, setRegularType] = useState<PrimitiveColumnType>("text");
  const [sheriffName, setSheriffName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sourcePrompt, setSourcePrompt] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<DraftOutput[]>([emptyOutput()]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mention, setMention] = useState<SlashMention | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const create = useMutation({
    mutationFn: (input: Parameters<typeof addColumn>[1]) => addColumn(tableId, input),
    onSuccess: async (result) => {
      if (isTableResponse(result)) {
        queryClient.setQueryData(tableKeys.detail(tableId), result);
      }
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      resetForm();
      onOpenChange(false);
    },
  });

  const mentionableColumns = useMemo(
    () => columns.filter((column) => !isComputedColumnType(column.type)),
    [columns],
  );
  const mentionMatches = useMemo(() => {
    if (!mention) {
      return [];
    }
    const query = mention.query.trim().toLowerCase();
    if (!query) {
      return mentionableColumns;
    }
    return mentionableColumns.filter((column) => column.name.toLowerCase().includes(query));
  }, [mention, mentionableColumns]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mention?.start, mention?.query]);

  useEffect(() => {
    const caret = pendingCaretRef.current;
    const node = promptRef.current;
    if (caret === null || !node) {
      return;
    }
    node.focus();
    node.setSelectionRange(caret, caret);
    pendingCaretRef.current = null;
  }, [prompt]);

  const expand = useMutation({
    mutationFn: (goal: string) => expandSheriffPrompt(tableId, { goal }),
    onSuccess: (result) => {
      setSourcePrompt(result.user_prompt);
      setPrompt(result.enhanced_prompt);
      setMention(null);
      setOutputs(
        result.outputs.length > 0
          ? result.outputs.map((field) => ({ id: nextId(), key: field.key, type: field.type }))
          : [emptyOutput()],
      );
    },
  });

  function resetForm() {
    setView("picker");
    setRegularName("");
    setRegularType("text");
    setSheriffName("");
    setPrompt("");
    setSourcePrompt(null);
    setMention(null);
    setOutputs([emptyOutput()]);
    setValidationError(null);
    create.reset();
    expand.reset();
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

  function handleRegularSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    create.reset();

    const parsed = primitiveColumnCreateSchema.safeParse({ name: regularName, type: regularType });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid column");
      return;
    }

    create.mutate(parsed.data);
  }

  function handleSheriffSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    create.reset();
    expand.reset();

    const parsed = sheriffColumnCreateSchema.safeParse({
      name: sheriffName,
      type: "sheriff",
      sheriff: {
        user_prompt: sourcePrompt ?? prompt,
        enhanced_prompt: sourcePrompt ? prompt : undefined,
        outputs: outputs.map((field) => ({ key: field.key, type: field.type })),
      },
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid sheriff column");
      return;
    }

    create.mutate(parsed.data);
  }

  function handleExpand() {
    setValidationError(null);
    expand.reset();
    const parsed = sheriffExpandRequestSchema.safeParse({ goal: prompt });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Enter a prompt to expand");
      return;
    }
    expand.mutate(parsed.data.goal);
  }

  function syncMention(text: string, cursor: number) {
    setMention(slashMentionAt(text, cursor));
  }

  function insertColumnMention(columnName: string) {
    const cursor = promptRef.current?.selectionStart ?? prompt.length;
    const active = mention ?? slashMentionAt(prompt, cursor);
    if (!active) {
      return;
    }
    const token = `{{${columnName}}}`;
    const next = `${prompt.slice(0, active.start)}${token}${prompt.slice(cursor)}`;
    pendingCaretRef.current = active.start + token.length;
    setPrompt(next);
    setMention(null);
  }

  function handlePromptKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setMention(null);
      return;
    }
    if (mentionMatches.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionIndex((current) => (current + 1) % mentionMatches.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionIndex((current) => (current - 1 + mentionMatches.length) % mentionMatches.length);
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      const selected = mentionMatches[mentionIndex] ?? mentionMatches[0];
      if (selected) {
        event.preventDefault();
        insertColumnMention(selected.name);
      }
    }
  }

  const error =
    validationError ??
    (mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "") ||
      mutationErrorMessage(expand.error, expand.isError ? "Failed to expand prompt" : ""));

  const title =
    view === "regular"
      ? "Text or boolean"
      : view === "sheriff"
        ? "Sheriff"
        : view === "email_enrichment"
          ? "Find work email"
          : view === "email_validation"
            ? "Verify email"
            : "Add column";
  const description =
    view === "regular"
      ? "Text or boolean. Column type cannot be changed later."
      : view === "sheriff"
        ? "Research the web and write results into output columns."
        : view === "email_enrichment"
          ? "Look up a work email from name, company, and LinkedIn."
          : view === "email_validation"
            ? "Check an existing email column with MillionVerifier."
            : "Choose the kind of column to add.";

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          {view !== "picker" ? (
            <button
              type="button"
              className="mb-1 inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setValidationError(null);
                create.reset();
                expand.reset();
                setView("picker");
              }}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
              Back
            </button>
          ) : null}
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
          <DrawerClose
            disabled={create.isPending}
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        {view === "picker" ? (
          <>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
              <ColumnTypeOption
                icon={TextFontIcon}
                title="Text or boolean"
                description="A regular column you fill in yourself."
                onClick={() => setView("regular")}
              />
              <ColumnTypeOption
                icon={Sheriff01Icon}
                title="Sheriff"
                description="A research prompt that writes into child columns."
                onClick={() => setView("sheriff")}
              />
              <ColumnTypeOption
                icon={MailSearch01Icon}
                title="Find work email"
                description="Look up a work email from name, company, and LinkedIn."
                onClick={() => setView("email_enrichment")}
              />
              <ColumnTypeOption
                icon={MailValidation01Icon}
                title="Verify email"
                description="Check an existing email column with MillionVerifier."
                onClick={() => setView("email_validation")}
              />
            </div>
            <DrawerFooter className="flex-row justify-end">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </DrawerFooter>
          </>
        ) : null}

        {view === "regular" ? (
          <form onSubmit={handleRegularSubmit} className="flex min-h-0 flex-1 flex-col">
            <FieldGroup className="flex-1 gap-4 overflow-y-auto p-4">
              <Field>
                <FieldLabel htmlFor="column-name" className="text-xs text-muted-foreground">
                  Name
                </FieldLabel>
                <Input
                  id="column-name"
                  value={regularName}
                  onChange={(event) => setRegularName(event.target.value)}
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
                    value={regularType}
                    onChange={(event) => {
                      const parsed = primitiveColumnTypeSchema.safeParse(event.target.value);
                      if (parsed.success) {
                        setRegularType(parsed.data);
                      }
                    }}
                    className={`${nativeSelectClass} w-full`}
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
            <DrawerFooter className="flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={create.isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add column"}
              </Button>
            </DrawerFooter>
          </form>
        ) : null}

        {view === "sheriff" ? (
          <form onSubmit={handleSheriffSubmit} className="flex min-h-0 flex-1 flex-col">
            <FieldGroup className="flex-1 gap-4 overflow-y-auto p-4">
              <Field>
                <FieldLabel htmlFor="sheriff-name" className="text-xs text-muted-foreground">
                  Name
                </FieldLabel>
                <Input
                  id="sheriff-name"
                  value={sheriffName}
                  onChange={(event) => setSheriffName(event.target.value)}
                  placeholder="CEO"
                  required
                  autoFocus
                  className="h-9 rounded-lg px-3 text-sm"
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="sheriff-prompt" className="text-xs text-muted-foreground">
                    Prompt
                  </FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={expand.isPending || create.isPending}
                    onClick={handleExpand}
                  >
                    {expand.isPending ? "Expanding…" : "Expand"}
                  </Button>
                </div>
                <div className="relative">
                  <textarea
                    id="sheriff-prompt"
                    ref={promptRef}
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      syncMention(event.target.value, event.target.selectionStart);
                    }}
                    onKeyDown={handlePromptKeyDown}
                    onKeyUp={(event) => syncMention(event.currentTarget.value, event.currentTarget.selectionStart)}
                    onClick={(event) => syncMention(event.currentTarget.value, event.currentTarget.selectionStart)}
                    placeholder="Find the CEO of {{Company}}"
                    required
                    className={textareaClass}
                  />
                  {mention ? (
                    <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
                      {mentionMatches.length === 0 ? (
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">
                          {mentionableColumns.length === 0
                            ? "No columns to mention yet"
                            : "No matching columns"}
                        </p>
                      ) : (
                        mentionMatches.map((column, index) => (
                          <button
                            key={column.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                            data-active={index === mentionIndex ? "true" : undefined}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setMentionIndex(index)}
                            onClick={() => insertColumnMention(column.name)}
                          >
                            <span className="truncate font-medium">{column.name}</span>
                            <span className="ml-2 shrink-0 text-muted-foreground">{column.type}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                <FieldDescription>
                  Type / to insert a column as {"{{Column name}}"}. Expand is optional.
                </FieldDescription>
              </Field>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Outputs</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={outputs.length >= 10 || create.isPending}
                    onClick={() => setOutputs((current) => [...current, emptyOutput()])}
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                    Add output
                  </Button>
                </div>
                {outputs.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      value={field.key}
                      onChange={(event) =>
                        setOutputs((current) =>
                          current.map((entry) =>
                            entry.id === field.id ? { ...entry, key: event.target.value } : entry,
                          ),
                        )
                      }
                      placeholder="first_name"
                      className="h-9 rounded-lg px-3 text-sm"
                    />
                    <div className="relative shrink-0">
                      <select
                        value={field.type}
                        onChange={(event) => {
                          const parsed = primitiveColumnTypeSchema.safeParse(event.target.value);
                          if (!parsed.success) {
                            return;
                          }
                          setOutputs((current) =>
                            current.map((entry) =>
                              entry.id === field.id ? { ...entry, type: parsed.data } : entry,
                            ),
                          );
                        }}
                        className={`${nativeSelectClass} w-28`}
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
                      aria-label="Remove output"
                      disabled={outputs.length === 1 || create.isPending}
                      onClick={() =>
                        setOutputs((current) => current.filter((entry) => entry.id !== field.id))
                      }
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                    </Button>
                  </div>
                ))}
                <FieldDescription>Keys must be lowercase snake_case. Max 10.</FieldDescription>
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </FieldGroup>
            <DrawerFooter className="flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={create.isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || expand.isPending}>
                {create.isPending ? "Adding…" : "Add column"}
              </Button>
            </DrawerFooter>
          </form>
        ) : null}

        {view === "email_enrichment" ? (
          <EmailEnrichmentColumnForm
            columns={columns}
            pending={create.isPending}
            error={mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "")}
            submitLabel="Add column"
            pendingLabel="Adding…"
            onCancel={() => handleOpenChange(false)}
            onSubmit={(input) => {
              setValidationError(null);
              create.reset();
              create.mutate({
                name: input.name,
                type: "email_enrichment",
                email_enrichment: input.email_enrichment,
              });
            }}
          />
        ) : null}

        {view === "email_validation" ? (
          <EmailValidationColumnForm
            columns={columns}
            pending={create.isPending}
            error={mutationErrorMessage(create.error, create.isError ? "Failed to add column" : "")}
            submitLabel="Add column"
            pendingLabel="Adding…"
            onCancel={() => handleOpenChange(false)}
            onSubmit={(input) => {
              setValidationError(null);
              create.reset();
              create.mutate({
                name: input.name,
                type: "email_validation",
                email_validation: input.email_validation,
              });
            }}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function ColumnTypeOption({
  icon,
  title,
  description,
  onClick,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-background p-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
