import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildTableFilter,
  filterOperatorLabel,
  formatFilterValue,
  mutationErrorMessage,
  operatorsForColumnType,
  replaceTableFilters,
  tableKeys,
  type ColumnResponse,
  type FilterOperator,
  type TableFilter,
} from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, FilterIcon, Tick02Icon } from "@hugeicons/core-free-icons";

type TableFilterBarProps = {
  tableId: string;
  columns: ColumnResponse[];
  filters: TableFilter[];
  onFiltersSaved?: () => void;
};

type EditorState =
  | { mode: "new" }
  | { mode: "edit"; index: number };

const nativeSelectClass =
  "h-7 appearance-none rounded-md border border-input bg-input/20 px-2 pr-6 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

export function TableFilterBar({ tableId, columns, filters, onFiltersSaved }: TableFilterBarProps) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState | null>(null);

  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );
  const filterableColumns = useMemo(
    () => columns.filter((column) => column.type === "text" || column.type === "boolean"),
    [columns],
  );

  const save = useMutation({
    mutationFn: (nextFilters: TableFilter[]) => replaceTableFilters(tableId, nextFilters),
    onSuccess: async (table) => {
      queryClient.setQueryData(tableKeys.detail(tableId), table);
      queryClient.removeQueries({ queryKey: tableKeys.rowList(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.rowList(tableId) });
      setEditor(null);
      onFiltersSaved?.();
    },
  });

  const error = mutationErrorMessage(save.error, save.isError ? "Failed to update filters" : "");

  function persist(nextFilters: TableFilter[]) {
    save.reset();
    save.mutate(nextFilters);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((filter, index) => {
          if (editor?.mode === "edit" && editor.index === index) {
            return (
              <FilterEditor
                key={`edit-${index}`}
                columns={filterableColumns}
                initial={filter}
                disabled={save.isPending}
                onCancel={() => setEditor(null)}
                onSave={(next) => {
                  const nextFilters = [...filters];
                  nextFilters[index] = next;
                  persist(nextFilters);
                }}
              />
            );
          }
          const column = columnsById.get(filter.column_id);
          const valueLabel = formatFilterValue(filter);
          return (
            <span key={`${filter.column_id}-${index}`} className="inline-flex items-center">
              {index > 0 ? <span className="mr-1.5 text-xs text-muted-foreground">and</span> : null}
              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40">
                <button
                  type="button"
                  className="inline-flex max-w-72 items-center gap-1 rounded-l-full py-1 pr-1 pl-2.5 text-left text-xs hover:bg-muted/80"
                  onClick={() => setEditor({ mode: "edit", index })}
                >
                  <span className="truncate font-medium text-foreground">{column?.name ?? "Unknown column"}</span>
                  <span className="shrink-0 text-muted-foreground">{filterOperatorLabel(filter.operator)}</span>
                  {valueLabel ? (
                    <span className="truncate font-medium text-foreground">{valueLabel}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label="Remove filter"
                  className="rounded-r-full px-1.5 py-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  disabled={save.isPending}
                  onClick={() => persist(filters.filter((_, current) => current !== index))}
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                </button>
              </span>
            </span>
          );
        })}

        {editor?.mode === "new" ? (
          <FilterEditor
            columns={filterableColumns}
            disabled={save.isPending}
            onCancel={() => setEditor(null)}
            onSave={(next) => persist([...filters, next])}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={filterableColumns.length === 0 || save.isPending}
            onClick={() => setEditor({ mode: "new" })}
          >
            <HugeiconsIcon icon={FilterIcon} strokeWidth={2} />
            Add filter
          </Button>
        )}

        {filters.length > 0 && editor === null ? (
          <Button type="button" variant="ghost" size="sm" disabled={save.isPending} onClick={() => persist([])}>
            Clear
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type FilterEditorProps = {
  columns: ColumnResponse[];
  initial?: TableFilter;
  disabled?: boolean;
  onSave: (filter: TableFilter) => void;
  onCancel: () => void;
};

function FilterEditor({ columns, initial, disabled = false, onSave, onCancel }: FilterEditorProps) {
  const fallbackColumn = columns[0];
  const initialColumn = columns.find((column) => column.id === initial?.column_id) ?? fallbackColumn;
  const [columnId, setColumnId] = useState(initialColumn?.id ?? "");
  const [operator, setOperator] = useState<FilterOperator>(
    initial?.operator ?? defaultOperator(initialColumn?.type ?? "text"),
  );
  const [textValue, setTextValue] = useState(
    typeof initial?.value === "string" ? initial.value : "",
  );
  const [booleanValue, setBooleanValue] = useState(
    typeof initial?.value === "boolean" ? initial.value : true,
  );
  const [error, setError] = useState<string | null>(null);

  const column = columns.find((item) => item.id === columnId) ?? fallbackColumn;
  const operators = column ? operatorsForColumnType(column.type) : [];

  function applyColumnChange(nextId: string) {
    const nextColumn = columns.find((item) => item.id === nextId);
    if (!nextColumn) {
      return;
    }
    setColumnId(nextId);
    setOperator(defaultOperator(nextColumn.type));
    setTextValue("");
    setBooleanValue(true);
    setError(null);
  }

  function applyOperatorChange(nextOperator: FilterOperator) {
    setOperator(nextOperator);
    setError(null);
  }

  function submit() {
    if (!column) {
      setError("Select a column");
      return;
    }
    const result = buildTableFilter({
      column,
      operator,
      value: operator === "is_empty" ? null : column.type === "boolean" ? booleanValue : textValue,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSave(result.filter);
  }

  if (!column) {
    return null;
  }

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2 py-1.5"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <label className="sr-only" htmlFor="filter-column">
        Column
      </label>
      <select
        id="filter-column"
        value={column.id}
        disabled={disabled}
        className={cn(nativeSelectClass, "max-w-40")}
        onChange={(event) => applyColumnChange(event.target.value)}
      >
        {columns.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-operator">
        Operator
      </label>
      <select
        id="filter-operator"
        value={operator}
        disabled={disabled}
        className={nativeSelectClass}
        onChange={(event) => applyOperatorChange(event.target.value as FilterOperator)}
      >
        {operators.map((item) => (
          <option key={item} value={item}>
            {filterOperatorLabel(item)}
          </option>
        ))}
      </select>

      {operator !== "is_empty" && column.type === "boolean" ? (
        <select
          aria-label="Value"
          value={booleanValue ? "true" : "false"}
          disabled={disabled}
          className={nativeSelectClass}
          onChange={(event) => setBooleanValue(event.target.value === "true")}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      ) : null}

      {operator !== "is_empty" && column.type === "text" ? (
        <Input
          value={textValue}
          disabled={disabled}
          placeholder="Value"
          className="h-7 w-36 rounded-md px-2 text-xs"
          onChange={(event) => setTextValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          autoFocus={!initial}
        />
      ) : null}

      <Button type="button" size="sm" disabled={disabled} onClick={submit}>
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3" />
        Apply
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label="Cancel" onClick={onCancel}>
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
      {error ? <p className="basis-full text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function defaultOperator(type: string): FilterOperator {
  return type === "text" ? "contains" : "eq";
}
