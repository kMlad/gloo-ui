import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_SHERIFF_MODEL,
  DEFAULT_SHERIFF_WEB_SEARCH,
  SHERIFF_MODELS,
  expandSheriffPrompt,
  getSheriffOptions,
  isComputedColumnType,
  mutationErrorMessage,
  primitiveColumnTypeSchema,
  sheriffColumnCreateSchema,
  sheriffExpandRequestSchema,
  sheriffModelLabel,
  sheriffModelSchema,
  tableKeys,
  type ColumnResponse,
  type PrimitiveColumnType,
  type SheriffConfig,
  type SheriffModel,
} from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { DrawerFooter } from "@/ui/components/ui/drawer";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Cancel01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

const textareaClass =
  "min-h-40 w-full resize-y rounded-lg border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

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

type DraftOutput = {
  id: string;
  key: string;
  type: PrimitiveColumnType;
  locked?: boolean;
};

function nextId() {
  return crypto.randomUUID();
}

function emptyOutput(): DraftOutput {
  return { id: nextId(), key: "", type: "text" };
}

function outputsFromConfig(config: SheriffConfig | null): DraftOutput[] {
  if (!config || config.outputs.length === 0) {
    return [emptyOutput()];
  }
  return config.outputs.map((field) => ({
    id: nextId(),
    key: field.key,
    type: field.type,
    locked: true,
  }));
}

function promptFromConfig(config: SheriffConfig | null): { prompt: string; sourcePrompt: string | null } {
  if (!config) {
    return { prompt: "", sourcePrompt: null };
  }
  if (config.enhanced_prompt) {
    return { prompt: config.enhanced_prompt, sourcePrompt: config.user_prompt };
  }
  return { prompt: config.user_prompt, sourcePrompt: null };
}

export type SheriffColumnFormProps = {
  tableId: string;
  columns: ColumnResponse[];
  excludeColumnIds?: string[];
  initialName?: string;
  initialConfig?: SheriffConfig | null;
  idPrefix?: string;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (input: { name: string; sheriff: SheriffConfig }) => void;
  onCancel: () => void;
};

export function SheriffColumnForm({
  tableId,
  columns,
  excludeColumnIds = [],
  initialName = "",
  initialConfig = null,
  idPrefix = "sheriff",
  pending,
  error,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
}: SheriffColumnFormProps) {
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const webSearchTouched = useRef(false);
  const modelTouched = useRef(false);
  const initialPrompt = promptFromConfig(initialConfig);
  const [name, setName] = useState(initialName);
  const [prompt, setPrompt] = useState(initialPrompt.prompt);
  const [sourcePrompt, setSourcePrompt] = useState<string | null>(initialPrompt.sourcePrompt);
  const [outputs, setOutputs] = useState<DraftOutput[]>(() => outputsFromConfig(initialConfig));
  const [webSearch, setWebSearch] = useState(initialConfig?.web_search ?? DEFAULT_SHERIFF_WEB_SEARCH);
  const [model, setModel] = useState<SheriffModel>(initialConfig?.model ?? DEFAULT_SHERIFF_MODEL);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mention, setMention] = useState<SlashMention | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const options = useQuery({
    queryKey: tableKeys.sheriffOptions(tableId),
    queryFn: () => getSheriffOptions(tableId),
  });

  const expand = useMutation({
    mutationFn: (goal: string) => expandSheriffPrompt(tableId, { goal }),
    onSuccess: (result) => {
      setSourcePrompt(result.user_prompt);
      setPrompt(result.enhanced_prompt);
      setMention(null);
      setOutputs((current) => {
        const locked = current.filter((field) => field.locked);
        const lockedKeys = new Set(locked.map((field) => field.key));
        const expanded = result.outputs
          .filter((field) => !lockedKeys.has(field.key))
          .map((field) => ({ id: nextId(), key: field.key, type: field.type }));
        const next = [...locked, ...expanded];
        return next.length > 0 ? next : [emptyOutput()];
      });
    },
  });

  const excluded = useMemo(() => new Set(excludeColumnIds), [excludeColumnIds]);
  const mentionableColumns = useMemo(
    () => columns.filter((column) => !isComputedColumnType(column.type) && !excluded.has(column.id)),
    [columns, excluded],
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
  const modelOptions = useMemo(() => {
    const source = options.data?.models?.length ? options.data.models : [...SHERIFF_MODELS];
    const listed = source.filter((value): value is SheriffModel => sheriffModelSchema.safeParse(value).success);
    const unique = [...new Set(listed)];
    if (!unique.includes(model)) {
      return [model, ...unique];
    }
    return unique;
  }, [model, options.data?.models]);

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

  useEffect(() => {
    if (initialConfig || !options.data) {
      return;
    }
    if (!webSearchTouched.current) {
      setWebSearch(options.data.default_web_search);
    }
    if (!modelTouched.current) {
      const parsed = sheriffModelSchema.safeParse(options.data.default_model);
      if (parsed.success) {
        setModel(parsed.data);
      }
    }
  }, [initialConfig, options.data]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    expand.reset();

    const parsed = sheriffColumnCreateSchema.safeParse({
      name,
      type: "sheriff",
      sheriff: {
        user_prompt: sourcePrompt ?? prompt,
        enhanced_prompt: sourcePrompt ? prompt : undefined,
        outputs: outputs.map((field) => ({ key: field.key, type: field.type })),
        web_search: webSearch,
        model,
      },
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid sheriff column");
      return;
    }

    onSubmit({ name: parsed.data.name, sheriff: parsed.data.sheriff });
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

  const lockedOutputCount = outputs.filter((field) => field.locked).length;
  const displayError =
    validationError ??
    error ??
    mutationErrorMessage(expand.error, expand.isError ? "Failed to expand prompt" : "");

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
            placeholder="CEO"
            required
            autoFocus
            className="h-9 rounded-lg px-3 text-sm"
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={`${idPrefix}-prompt`} className="text-xs text-muted-foreground">
              Prompt
            </FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={expand.isPending || pending}
              onClick={handleExpand}
            >
              {expand.isPending ? "Expanding…" : "Expand"}
            </Button>
          </div>
          <div className="relative">
            <textarea
              id={`${idPrefix}-prompt`}
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
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-model`} className="text-xs text-muted-foreground">
            Model
          </FieldLabel>
          <div className="relative">
            <select
              id={`${idPrefix}-model`}
              value={model}
              disabled={pending}
              onChange={(event) => {
                const parsed = sheriffModelSchema.safeParse(event.target.value);
                if (!parsed.success) {
                  return;
                }
                modelTouched.current = true;
                setModel(parsed.data);
              }}
              className={`${nativeSelectClass} w-full`}
            >
              {modelOptions.map((value) => (
                <option key={value} value={value}>
                  {sheriffModelLabel(value)}
                </option>
              ))}
            </select>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <FieldDescription>Used for this column's research runs.</FieldDescription>
        </Field>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Web search</p>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2">
            <Checkbox
              checked={webSearch}
              disabled={pending}
              aria-label="Search the web while researching"
              onCheckedChange={(next) => {
                if (typeof next === "boolean") {
                  webSearchTouched.current = true;
                  setWebSearch(next);
                }
              }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">Search the web</span>
          </div>
          <FieldDescription>
            When on, Sheriff can look up sources on the web. Turn off to answer from the model only.
          </FieldDescription>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Outputs</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={outputs.length >= 10 || pending}
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
                disabled={pending || field.locked}
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
                  disabled={pending || field.locked}
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
                disabled={outputs.length === 1 || pending || field.locked || lockedOutputCount === outputs.length}
                onClick={() =>
                  setOutputs((current) => current.filter((entry) => entry.id !== field.id))
                }
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
          ))}
          <FieldDescription>
            Keys must be lowercase snake_case. Max 10.
            {lockedOutputCount > 0 ? " Existing outputs stay in place." : ""}
          </FieldDescription>
        </div>
        {displayError ? <p className="text-xs text-destructive">{displayError}</p> : null}
      </FieldGroup>
      <DrawerFooter className="flex-row justify-end">
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || expand.isPending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </DrawerFooter>
    </form>
  );
}
