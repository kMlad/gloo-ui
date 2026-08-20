import { z } from "zod";
import { apiFetch } from "@/lib/api";

export const primitiveColumnTypeSchema = z.enum(["text", "boolean"]);
export type PrimitiveColumnType = z.infer<typeof primitiveColumnTypeSchema>;

export const columnTypeSchema = z.enum(["text", "boolean", "sheriff"]);
export type ColumnType = z.infer<typeof columnTypeSchema>;

const columnNameSchema = z.string().trim().min(1, "Column name is required").max(200);

export const sheriffOutputKeySchema = z
  .string()
  .trim()
  .min(1, "Output key is required")
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase snake_case, e.g. first_name");

export const sheriffOutputFieldSchema = z.object({
  key: sheriffOutputKeySchema,
  type: primitiveColumnTypeSchema,
});
export type SheriffOutputField = z.infer<typeof sheriffOutputFieldSchema>;

export const sheriffConfigSchema = z
  .object({
    user_prompt: z.string().trim().min(1, "Prompt is required").max(8000),
    enhanced_prompt: z.string().trim().max(16_000).nullish(),
    outputs: z.array(sheriffOutputFieldSchema).min(1, "Add at least one output").max(10),
  })
  .refine(
    (config) => {
      const keys = config.outputs.map((field) => field.key);
      return new Set(keys).size === keys.length;
    },
    { message: "Output keys must be unique", path: ["outputs"] },
  );
export type SheriffConfig = z.infer<typeof sheriffConfigSchema>;

export const primitiveColumnCreateSchema = z.object({
  name: columnNameSchema,
  type: primitiveColumnTypeSchema,
});

export const sheriffColumnCreateSchema = z.object({
  name: columnNameSchema,
  type: z.literal("sheriff"),
  sheriff: sheriffConfigSchema,
});

export const columnCreateSchema = z.discriminatedUnion("type", [
  primitiveColumnCreateSchema,
  sheriffColumnCreateSchema,
]);
export type ColumnCreate = z.infer<typeof columnCreateSchema>;

export const sheriffExpandRequestSchema = z.object({
  goal: z.string().trim().min(1, "Prompt is required").max(8000),
  column_ids: z.array(z.string().uuid()).optional(),
});
export type SheriffExpandRequest = z.infer<typeof sheriffExpandRequestSchema>;

export type SheriffInputColumn = {
  id: string;
  name: string;
};

export type SheriffExpandResponse = {
  user_prompt: string;
  enhanced_prompt: string;
  outputs: SheriffOutputField[];
  input_columns: SheriffInputColumn[];
};

export const sheriffCellStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
export type SheriffCellStatus = z.infer<typeof sheriffCellStatusSchema>;

export const sheriffConfidenceSchema = z.enum(["high", "medium", "low"]);
export type SheriffConfidence = z.infer<typeof sheriffConfidenceSchema>;

export const sheriffSourceSchema = z.object({
  url: z.string(),
  title: z.string().optional().default(""),
});
export type SheriffSource = z.infer<typeof sheriffSourceSchema>;

export const sheriffCellSchema = z.object({
  status: sheriffCellStatusSchema,
  confidence: sheriffConfidenceSchema.nullish(),
  confidence_reason: z.string().nullish(),
  sources: z.array(sheriffSourceSchema).optional().default([]),
  output: z.record(z.string(), z.unknown()).nullish(),
  error: z.string().nullish(),
});
export type SheriffCell = z.infer<typeof sheriffCellSchema>;

export type SheriffRunCreate = {
  row_ids?: string[];
  overwrite?: boolean;
};

export type SheriffRunStatus = "queued" | "running" | "succeeded" | "partial" | "failed";
export type SheriffRunItemStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

export type SheriffRunItemResponse = {
  id: string;
  row_id: string;
  status: SheriffRunItemStatus;
  error_message: string | null;
  model_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SheriffRunResponse = {
  id: string;
  table_id: string;
  column_id: string;
  created_by: string;
  status: SheriffRunStatus;
  row_ids: string[] | null;
  overwrite: boolean;
  total_count: number;
  succeeded_count: number;
  failed_count: number;
  skipped_count: number;
  items: SheriffRunItemResponse[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export const tableCreateSchema = z.object({
  name: z.string().trim().min(1, "Table name is required").max(200),
  columns: z.array(primitiveColumnCreateSchema).optional(),
});
export type TableCreate = z.infer<typeof tableCreateSchema>;

export const tableUpdateSchema = z.object({
  name: z.string().trim().min(1, "Table name is required").max(200),
});
export type TableUpdate = z.infer<typeof tableUpdateSchema>;

export const columnUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Column name is required").max(200).optional(),
    hidden: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.hidden !== undefined, {
    message: "At least one field is required",
  });
export type ColumnUpdate = z.infer<typeof columnUpdateSchema>;

export const filterOperatorSchema = z.enum(["eq", "contains", "is_empty"]);
export type FilterOperator = z.infer<typeof filterOperatorSchema>;

export type CellValue = string | boolean | null | Record<string, unknown>;
export type RowValues = Record<string, CellValue>;

export type TableListItem = {
  id: string;
  name: string;
  column_count: number;
  row_count: number;
  created_at: string;
  updated_at: string;
};

export type TableListResponse = {
  items: TableListItem[];
};

export type ColumnResponse = {
  id: string;
  name: string;
  type: ColumnType;
  position: number;
  hidden: boolean;
  config?: Record<string, unknown> | null;
  source_column_id?: string | null;
  source_field?: string | null;
  created_at: string;
  updated_at: string;
};

export type TableFilter = {
  column_id: string;
  operator: FilterOperator;
  value?: CellValue;
};

export type TableResponse = {
  id: string;
  name: string;
  created_by: string;
  filters: TableFilter[];
  columns: ColumnResponse[];
  created_at: string;
  updated_at: string;
};

export type RowResponse = {
  id: string;
  position: number;
  values: RowValues;
  created_at: string;
  updated_at: string;
};

export type RowListResponse = {
  items: RowResponse[];
  total: number;
  limit: number;
  offset: number;
};

export type RowCreate = {
  values?: RowValues;
};

export type RowUpdate = {
  values: RowValues;
};

export type ListRowsParams = {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

export const tableKeys = {
  all: ["tables"] as const,
  detail: (tableId: string) => ["tables", tableId] as const,
  rowList: (tableId: string) => ["tables", tableId, "rows"] as const,
  rows: (tableId: string, params: { limit: number; offset: number }) =>
    ["tables", tableId, "rows", params] as const,
};

export const ROW_PAGE_SIZE = 100;

export function listTables() {
  return apiFetch<TableListResponse>("/tables");
}

export function createTable(input: TableCreate) {
  return apiFetch<TableResponse>("/tables", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function importTableCsv(file: File, name?: string) {
  const form = new FormData();
  form.append("file", file);
  if (name) {
    form.append("name", name);
  }
  return apiFetch<TableResponse>("/tables/imports", {
    method: "POST",
    body: form,
  });
}

export function getTable(tableId: string) {
  return apiFetch<TableResponse>(`/tables/${tableId}`);
}

export function updateTable(tableId: string, input: TableUpdate) {
  return apiFetch<TableResponse>(`/tables/${tableId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function replaceTableFilters(tableId: string, filters: TableFilter[]) {
  return apiFetch<TableResponse>(`/tables/${tableId}/filters`, {
    method: "PUT",
    body: JSON.stringify({ filters: serializeTableFilters(filters) }),
  });
}

export function deleteTable(tableId: string) {
  return apiFetch<void>(`/tables/${tableId}`, {
    method: "DELETE",
  });
}

export function addColumn(tableId: string, input: ColumnCreate) {
  return apiFetch<ColumnResponse | TableResponse>(`/tables/${tableId}/columns`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function isTableResponse(value: ColumnResponse | TableResponse): value is TableResponse {
  return "columns" in value && Array.isArray(value.columns);
}

export function expandSheriffPrompt(tableId: string, input: SheriffExpandRequest) {
  return apiFetch<SheriffExpandResponse>(`/tables/${tableId}/sheriff/prompts/expand`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function startSheriffRun(tableId: string, columnId: string, input: SheriffRunCreate = {}) {
  return apiFetch<SheriffRunResponse>(`/tables/${tableId}/columns/${columnId}/runs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateColumn(tableId: string, columnId: string, input: ColumnUpdate) {
  return apiFetch<ColumnResponse>(`/tables/${tableId}/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteColumn(tableId: string, columnId: string) {
  return apiFetch<void>(`/tables/${tableId}/columns/${columnId}`, {
    method: "DELETE",
  });
}

export function reorderColumns(tableId: string, columnIds: string[]) {
  return apiFetch<TableResponse>(`/tables/${tableId}/columns/order`, {
    method: "PUT",
    body: JSON.stringify({ column_ids: columnIds }),
  });
}

export function listRows(tableId: string, params: ListRowsParams = {}) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const query = search.toString();
  return apiFetch<RowListResponse>(`/tables/${tableId}/rows${query ? `?${query}` : ""}`, {
    signal: params.signal,
  });
}

export function addRow(tableId: string, input: RowCreate = {}) {
  return apiFetch<RowResponse>(`/tables/${tableId}/rows`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRow(tableId: string, rowId: string, input: RowUpdate) {
  return apiFetch<RowResponse>(`/tables/${tableId}/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteRow(tableId: string, rowId: string) {
  return apiFetch<void>(`/tables/${tableId}/rows/${rowId}`, {
    method: "DELETE",
  });
}

export function formatTableDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function operatorsForColumnType(type: string): FilterOperator[] {
  if (type === "boolean") {
    return ["eq", "is_empty"];
  }
  if (type === "text") {
    return ["eq", "contains", "is_empty"];
  }
  return ["is_empty"];
}

export function filterOperatorLabel(operator: FilterOperator): string {
  if (operator === "eq") {
    return "is";
  }
  if (operator === "contains") {
    return "contains";
  }
  return "is empty";
}

export function formatFilterValue(filter: TableFilter): string | null {
  if (filter.operator === "is_empty") {
    return null;
  }
  if (typeof filter.value === "boolean") {
    return filter.value ? "True" : "False";
  }
  if (typeof filter.value === "string" && filter.value.length > 0) {
    return filter.value;
  }
  return null;
}

export function serializeTableFilters(filters: TableFilter[]): TableFilter[] {
  return filters.map((filter) => {
    if (filter.operator === "is_empty") {
      return { column_id: filter.column_id, operator: "is_empty" };
    }
    return {
      column_id: filter.column_id,
      operator: filter.operator,
      value: filter.value,
    };
  });
}

export function buildTableFilter(input: {
  column: ColumnResponse;
  operator: FilterOperator;
  value?: CellValue;
}): { ok: true; filter: TableFilter } | { ok: false; error: string } {
  const allowed = operatorsForColumnType(input.column.type);
  if (!allowed.includes(input.operator)) {
    return { ok: false, error: "That operator is not valid for this column" };
  }
  if (input.operator === "is_empty") {
    return {
      ok: true,
      filter: { column_id: input.column.id, operator: "is_empty" },
    };
  }
  if (input.operator === "contains") {
    if (typeof input.value !== "string" || input.value.trim().length === 0) {
      return { ok: false, error: "Enter a value to search for" };
    }
    return {
      ok: true,
      filter: {
        column_id: input.column.id,
        operator: "contains",
        value: input.value.trim(),
      },
    };
  }
  if (input.column.type === "boolean") {
    if (typeof input.value !== "boolean") {
      return { ok: false, error: "Choose True or False" };
    }
    return {
      ok: true,
      filter: { column_id: input.column.id, operator: "eq", value: input.value },
    };
  }
  if (typeof input.value !== "string" || input.value.trim().length === 0) {
    return { ok: false, error: "Enter a value" };
  }
  return {
    ok: true,
    filter: {
      column_id: input.column.id,
      operator: "eq",
      value: input.value.trim(),
    },
  };
}

export function parseSheriffCell(value: CellValue | undefined): SheriffCell | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const parsed = sheriffCellSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function sheriffCellIsActive(value: CellValue | undefined): boolean {
  const status = parseSheriffCell(value)?.status;
  return status === "queued" || status === "running";
}

export function sheriffInFlightStatus(
  value: CellValue | undefined,
  pending = false,
): "queued" | "running" | null {
  if (pending) {
    return "queued";
  }
  const status = parseSheriffCell(value)?.status;
  if (status === "queued" || status === "running") {
    return status;
  }
  return null;
}

export function rowsHaveActiveSheriff(rows: RowResponse[], columns: ColumnResponse[]): boolean {
  const sheriffIds = columns.filter((column) => column.type === "sheriff").map((column) => column.id);
  if (sheriffIds.length === 0) {
    return false;
  }
  return rows.some((row) => sheriffIds.some((columnId) => sheriffCellIsActive(row.values[columnId])));
}

export function orderedColumns(columns: ColumnResponse[]): ColumnResponse[] {
  return [...columns].sort((a, b) => a.position - b.position);
}

export function visibleColumns(columns: ColumnResponse[]): ColumnResponse[] {
  return orderedColumns(columns).filter((column) => !column.hidden);
}

export function hiddenColumns(columns: ColumnResponse[]): ColumnResponse[] {
  return orderedColumns(columns).filter((column) => column.hidden);
}

export function reorderVisibleColumns(
  columns: ColumnResponse[],
  sourceId: string,
  targetId: string,
): string[] | null {
  if (sourceId === targetId) {
    return null;
  }
  const ordered = orderedColumns(columns);
  const visibleIds = ordered.filter((column) => !column.hidden).map((column) => column.id);
  const from = visibleIds.indexOf(sourceId);
  const to = visibleIds.indexOf(targetId);
  if (from < 0 || to < 0) {
    return null;
  }
  const nextVisible = [...visibleIds];
  nextVisible.splice(from, 1);
  const insertAt = nextVisible.indexOf(targetId);
  if (insertAt < 0) {
    return null;
  }
  if (from < to) {
    nextVisible.splice(insertAt + 1, 0, sourceId);
  } else {
    nextVisible.splice(insertAt, 0, sourceId);
  }
  let index = 0;
  return ordered.map((column) => (column.hidden ? column.id : nextVisible[index++]));
}
