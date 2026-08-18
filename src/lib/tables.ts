import { z } from "zod";
import { apiFetch } from "@/lib/api";

export const columnTypeSchema = z.enum(["text", "boolean"]);
export type ColumnType = z.infer<typeof columnTypeSchema>;

export const columnCreateSchema = z.object({
  name: z.string().trim().min(1, "Column name is required").max(200),
  type: columnTypeSchema.default("text"),
});
export type ColumnCreate = z.infer<typeof columnCreateSchema>;

export const tableCreateSchema = z.object({
  name: z.string().trim().min(1, "Table name is required").max(200),
  columns: z.array(columnCreateSchema).optional(),
});
export type TableCreate = z.infer<typeof tableCreateSchema>;

export const tableUpdateSchema = z.object({
  name: z.string().trim().min(1, "Table name is required").max(200),
});
export type TableUpdate = z.infer<typeof tableUpdateSchema>;

export const columnUpdateSchema = z.object({
  name: z.string().trim().min(1, "Column name is required").max(200),
});
export type ColumnUpdate = z.infer<typeof columnUpdateSchema>;

export type CellValue = string | boolean | null;
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
  created_at: string;
  updated_at: string;
};

export type TableFilter = {
  column_id: string;
  operator: "eq" | "contains" | "is_empty";
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
};

export const tableKeys = {
  all: ["tables"] as const,
  detail: (tableId: string) => ["tables", tableId] as const,
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

export function deleteTable(tableId: string) {
  return apiFetch<void>(`/tables/${tableId}`, {
    method: "DELETE",
  });
}

export function addColumn(tableId: string, input: ColumnCreate) {
  return apiFetch<ColumnResponse>(`/tables/${tableId}/columns`, {
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

export function listRows(tableId: string, params: ListRowsParams = {}) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const query = search.toString();
  return apiFetch<RowListResponse>(`/tables/${tableId}/rows${query ? `?${query}` : ""}`);
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
