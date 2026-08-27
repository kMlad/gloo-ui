import { z } from "zod";
import { apiFetch, apiFetchBlob } from "@/lib/api";

export const primitiveColumnTypeSchema = z.enum(["text", "boolean"]);
export type PrimitiveColumnType = z.infer<typeof primitiveColumnTypeSchema>;

export const columnTypeSchema = z.enum([
  "text",
  "boolean",
  "sheriff",
  "email_enrichment",
  "email_validation",
]);
export type ColumnType = z.infer<typeof columnTypeSchema>;

export function isComputedColumnType(
  type: string,
): type is "sheriff" | "email_enrichment" | "email_validation" {
  return type === "sheriff" || type === "email_enrichment" || type === "email_validation";
}

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

export const EMAIL_PROVIDERS = ["icypeas", "kitt", "leadmagic", "prospeo", "fullenrich"] as const;
export const emailProviderSchema = z.enum(EMAIL_PROVIDERS);
export type EmailProvider = z.infer<typeof emailProviderSchema>;
export const EMAIL_PROVIDER_LABELS: Record<EmailProvider, string> = {
  icypeas: "Icypeas",
  kitt: "Kitt",
  leadmagic: "LeadMagic",
  prospeo: "Prospeo",
  fullenrich: "FullEnrich",
};

export const emailValidatorSchema = z.literal("millionverifier");
export type EmailValidator = z.infer<typeof emailValidatorSchema>;

const emailInputColumnIdSchema = z.string().uuid("Select a text column");

export const EMAIL_INPUT_FIELDS = [
  { key: "first_name_column_id", label: "First name" },
  { key: "last_name_column_id", label: "Last name" },
  { key: "linkedin_column_id", label: "LinkedIn" },
  { key: "company_name_column_id", label: "Company name" },
  { key: "company_domain_column_id", label: "Company domain" },
] as const;
export type EmailInputFieldKey = (typeof EMAIL_INPUT_FIELDS)[number]["key"];

export const emailEnrichmentConfigSchema = z
  .object({
    providers: z
      .array(emailProviderSchema)
      .min(1, "Turn on at least one provider")
      .refine((providers) => new Set(providers).size === providers.length, {
        message: "Providers must be unique",
      }),
    validator: emailValidatorSchema.default("millionverifier"),
    accept_catchall: z.boolean().default(false),
    first_name_column_id: emailInputColumnIdSchema,
    last_name_column_id: emailInputColumnIdSchema,
    linkedin_column_id: emailInputColumnIdSchema,
    company_name_column_id: emailInputColumnIdSchema,
    company_domain_column_id: emailInputColumnIdSchema,
  })
  .refine(
    (config) => {
      const ids = [
        config.first_name_column_id,
        config.last_name_column_id,
        config.linkedin_column_id,
        config.company_name_column_id,
        config.company_domain_column_id,
      ];
      return new Set(ids).size === ids.length;
    },
    { message: "Each mapping must use a different column" },
  );
export type EmailEnrichmentConfig = z.infer<typeof emailEnrichmentConfigSchema>;

export const emailEnrichmentColumnCreateSchema = z.object({
  name: columnNameSchema,
  type: z.literal("email_enrichment"),
  email_enrichment: emailEnrichmentConfigSchema,
});

export const emailValidationConfigSchema = z.object({
  email_column_id: emailInputColumnIdSchema,
  validator: emailValidatorSchema.default("millionverifier"),
  accept_catchall: z.boolean().default(false),
});
export type EmailValidationConfig = z.infer<typeof emailValidationConfigSchema>;

export const emailValidationColumnCreateSchema = z.object({
  name: columnNameSchema,
  type: z.literal("email_validation"),
  email_validation: emailValidationConfigSchema,
});

export const columnCreateSchema = z.discriminatedUnion("type", [
  primitiveColumnCreateSchema,
  sheriffColumnCreateSchema,
  emailEnrichmentColumnCreateSchema,
  emailValidationColumnCreateSchema,
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

export const emailEnrichmentCellStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "not_found",
]);
export type EmailEnrichmentCellStatus = z.infer<typeof emailEnrichmentCellStatusSchema>;

export const emailEnrichmentStepEmailSchema = z.object({
  email: z.string(),
  validation: z.string(),
});
export type EmailEnrichmentStepEmail = z.infer<typeof emailEnrichmentStepEmailSchema>;

export const emailEnrichmentStepSchema = z.object({
  provider: z.string(),
  status: z.string(),
  emails: z.array(emailEnrichmentStepEmailSchema).optional().default([]),
});
export type EmailEnrichmentStep = z.infer<typeof emailEnrichmentStepSchema>;

export const emailEnrichmentCellSchema = z.object({
  status: emailEnrichmentCellStatusSchema,
  email: z.string().nullish(),
  provider: z.string().nullish(),
  validator: z.string().nullish(),
  validation_result: z.string().nullish(),
  rejected_emails: z.array(z.string()).optional().default([]),
  steps: z.array(emailEnrichmentStepSchema).optional().default([]),
  error: z.string().nullish(),
});
export type EmailEnrichmentCell = z.infer<typeof emailEnrichmentCellSchema>;

export const emailValidationCellStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);
export type EmailValidationCellStatus = z.infer<typeof emailValidationCellStatusSchema>;

export const emailValidationCellSchema = z.object({
  status: emailValidationCellStatusSchema,
  email: z.string().nullish(),
  validator: z.string().nullish(),
  result: z.string().nullish(),
  valid: z.boolean().nullish(),
  error: z.string().nullish(),
});
export type EmailValidationCell = z.infer<typeof emailValidationCellSchema>;

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
    email_enrichment: emailEnrichmentConfigSchema.optional(),
    email_validation: emailValidationConfigSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.hidden !== undefined ||
      value.email_enrichment !== undefined ||
      value.email_validation !== undefined,
    {
      message: "At least one field is required",
    },
  );
export type ColumnUpdate = z.infer<typeof columnUpdateSchema>;

export const filterOperatorSchema = z.enum(["eq", "contains", "is_empty", "is_not_empty"]);
export type FilterOperator = z.infer<typeof filterOperatorSchema>;

export const filterLogicSchema = z.enum(["and", "or"]);
export type FilterLogic = z.infer<typeof filterLogicSchema>;

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
  logic?: FilterLogic;
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

export type TableExportParams = {
  sortColumnId?: string;
  sortDirection?: "asc" | "desc";
  fallbackFilename?: string;
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

export function csvFilenameFromTableName(tableName: string) {
  const stem = tableName.trim().replace(/[/\\"]+/g, "-").replace(/^[.\s-]+|[.\s-]+$/g, "") || "table";
  return stem.toLowerCase().endsWith(".csv") ? stem : `${stem}.csv`;
}

export async function exportTableCsv(tableId: string, params: TableExportParams = {}) {
  const search = new URLSearchParams();
  if (params.sortColumnId) {
    search.set("sort_column_id", params.sortColumnId);
    search.set("sort_direction", params.sortDirection ?? "asc");
  }
  const query = search.toString();
  const { blob, filename } = await apiFetchBlob(
    `/tables/${tableId}/export${query ? `?${query}` : ""}`,
  );
  return {
    blob,
    filename: filename ?? params.fallbackFilename ?? "table.csv",
  };
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadTableCsv(tableId: string, params: TableExportParams = {}) {
  const { blob, filename } = await exportTableCsv(tableId, params);
  triggerBrowserDownload(blob, filename);
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
    return ["eq", "is_empty", "is_not_empty"];
  }
  if (type === "text") {
    return ["eq", "contains", "is_empty", "is_not_empty"];
  }
  return ["is_empty", "is_not_empty"];
}

export function filterOperatorNeedsValue(operator: FilterOperator): boolean {
  return operator !== "is_empty" && operator !== "is_not_empty";
}

export function normalizeFilterLogic(logic: unknown): FilterLogic {
  return logic === "or" ? "or" : "and";
}

export function filterLogicLabel(logic: FilterLogic): string {
  return logic === "or" ? "or" : "and";
}

export function filterOperatorLabel(operator: FilterOperator): string {
  if (operator === "eq") {
    return "is";
  }
  if (operator === "contains") {
    return "contains";
  }
  if (operator === "is_not_empty") {
    return "is not empty";
  }
  return "is empty";
}

export function formatFilterValue(filter: TableFilter): string | null {
  if (!filterOperatorNeedsValue(filter.operator)) {
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
  return filters.map((filter, index) => {
    const logic = index === 0 ? "and" : normalizeFilterLogic(filter.logic);
    if (!filterOperatorNeedsValue(filter.operator)) {
      return { column_id: filter.column_id, operator: filter.operator, logic };
    }
    return {
      column_id: filter.column_id,
      operator: filter.operator,
      value: filter.value,
      logic,
    };
  });
}

export function buildTableFilter(input: {
  column: ColumnResponse;
  operator: FilterOperator;
  value?: CellValue;
  logic?: FilterLogic;
}): { ok: true; filter: TableFilter } | { ok: false; error: string } {
  const allowed = operatorsForColumnType(input.column.type);
  if (!allowed.includes(input.operator)) {
    return { ok: false, error: "That operator is not valid for this column" };
  }
  const logic = normalizeFilterLogic(input.logic);
  if (!filterOperatorNeedsValue(input.operator)) {
    return {
      ok: true,
      filter: { column_id: input.column.id, operator: input.operator, logic },
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
        logic,
      },
    };
  }
  if (input.column.type === "boolean") {
    if (typeof input.value !== "boolean") {
      return { ok: false, error: "Choose True or False" };
    }
    return {
      ok: true,
      filter: { column_id: input.column.id, operator: "eq", value: input.value, logic },
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
      logic,
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

export function parseEmailEnrichmentCell(value: CellValue | undefined): EmailEnrichmentCell | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const parsed = emailEnrichmentCellSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseEmailEnrichmentConfig(
  config: Record<string, unknown> | null | undefined,
): EmailEnrichmentConfig | null {
  if (config == null) {
    return null;
  }
  const parsed = emailEnrichmentConfigSchema.safeParse(config);
  return parsed.success ? parsed.data : null;
}

export function parseEmailValidationCell(value: CellValue | undefined): EmailValidationCell | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const parsed = emailValidationCellSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseEmailValidationConfig(
  config: Record<string, unknown> | null | undefined,
): EmailValidationConfig | null {
  if (config == null) {
    return null;
  }
  const parsed = emailValidationConfigSchema.safeParse(config);
  return parsed.success ? parsed.data : null;
}

export function sheriffCellIsActive(value: CellValue | undefined): boolean {
  const status = parseSheriffCell(value)?.status;
  return status === "queued" || status === "running";
}

export function sheriffCellIsFailed(value: CellValue | undefined): boolean {
  return parseSheriffCell(value)?.status === "failed";
}

export function emailEnrichmentCellIsActive(value: CellValue | undefined): boolean {
  const status = parseEmailEnrichmentCell(value)?.status;
  return status === "queued" || status === "running";
}

export function emailValidationCellIsActive(value: CellValue | undefined): boolean {
  const status = parseEmailValidationCell(value)?.status;
  return status === "queued" || status === "running";
}

function inFlightStatusFrom(
  status: string | undefined,
  pending = false,
): "queued" | "running" | null {
  if (pending) {
    return "queued";
  }
  if (status === "queued" || status === "running") {
    return status;
  }
  return null;
}

export function sheriffInFlightStatus(
  value: CellValue | undefined,
  pending = false,
): "queued" | "running" | null {
  return inFlightStatusFrom(parseSheriffCell(value)?.status, pending);
}

export function emailEnrichmentInFlightStatus(
  value: CellValue | undefined,
  pending = false,
): "queued" | "running" | null {
  return inFlightStatusFrom(parseEmailEnrichmentCell(value)?.status, pending);
}

export function emailValidationInFlightStatus(
  value: CellValue | undefined,
  pending = false,
): "queued" | "running" | null {
  return inFlightStatusFrom(parseEmailValidationCell(value)?.status, pending);
}

export function computedInFlightStatus(
  type: string,
  value: CellValue | undefined,
  pending = false,
): "queued" | "running" | null {
  if (type === "email_enrichment") {
    return emailEnrichmentInFlightStatus(value, pending);
  }
  if (type === "email_validation") {
    return emailValidationInFlightStatus(value, pending);
  }
  return sheriffInFlightStatus(value, pending);
}

function computedCellIsActive(type: string, value: CellValue | undefined): boolean {
  if (type === "email_enrichment") {
    return emailEnrichmentCellIsActive(value);
  }
  if (type === "email_validation") {
    return emailValidationCellIsActive(value);
  }
  if (type === "sheriff") {
    return sheriffCellIsActive(value);
  }
  return false;
}

export function rowsHaveActiveComputedRuns(rows: RowResponse[], columns: ColumnResponse[]): boolean {
  const computed = columns.filter((column) => isComputedColumnType(column.type));
  if (computed.length === 0) {
    return false;
  }
  return rows.some((row) =>
    computed.some((column) => computedCellIsActive(column.type, row.values[column.id])),
  );
}

export function rowsHaveActiveSheriff(rows: RowResponse[], columns: ColumnResponse[]): boolean {
  return rowsHaveActiveComputedRuns(rows, columns);
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
