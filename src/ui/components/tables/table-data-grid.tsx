import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  sheriffInFlightStatus,
  deleteColumn,
  deleteRow,
  mutationErrorMessage,
  reorderColumns,
  reorderVisibleColumns,
  startSheriffRun,
  tableKeys,
  updateColumn,
  updateRow,
  visibleColumns,
  type ColumnResponse,
  type RowResponse,
  type RowListResponse,
  type TableResponse,
} from "@/lib/tables";
import { tableGridFeatures, type TableGridFeatures } from "@/ui/components/tables/data-table-features";
import { BooleanCell, EditableTextCell } from "@/ui/components/tables/editable-cell";
import { SheriffCell } from "@/ui/components/tables/sheriff-cell";
import { SheriffRunDrawer } from "@/ui/components/tables/sheriff-run-drawer";
import { ConfirmDeleteDialog } from "@/ui/components/tables/confirm-delete-dialog";
import { RenameColumnDialog } from "@/ui/components/tables/rename-column-dialog";
import { Button } from "@/ui/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/ui/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  BanIcon,
  MoreVerticalIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";

function sheriffRunKey(rowId: string, columnId: string) {
  return `${rowId}:${columnId}`;
}

type SheriffSelection = {
  columnId: string;
  rowIds: string[];
};

type SheriffAnchor = {
  columnId: string;
  rowId: string;
};

function rowIdsBetween(orderedRowIds: string[], fromId: string, toId: string) {
  const fromIndex = orderedRowIds.indexOf(fromId);
  const toIndex = orderedRowIds.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1) {
    return [toId];
  }
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return orderedRowIds.slice(start, end + 1);
}

const rowNumberColumnClass =
  "sticky left-0 z-10 w-12 min-w-12 select-none border-r bg-card px-1 text-center group-hover:bg-muted/50";
const rowNumberHeaderClass =
  "sticky left-0 z-20 w-12 min-w-12 select-none border-r bg-card px-1 text-center";

const columnHelper = createColumnHelper<TableGridFeatures, RowResponse>();

function clearColumnDropTargets(from: EventTarget | null) {
  const headerRow = from instanceof Element ? from.closest("tr") : null;
  headerRow?.querySelectorAll("[data-column-head]").forEach((node) => {
    if (node instanceof HTMLElement) {
      delete node.dataset.dropTarget;
    }
  });
}

function clearColumnDragMarks(from: EventTarget | null) {
  const headerRow = from instanceof Element ? from.closest("tr") : null;
  headerRow?.querySelectorAll("[data-column-head]").forEach((node) => {
    if (node instanceof HTMLElement) {
      delete node.dataset.dragging;
      delete node.dataset.dropTarget;
    }
  });
}

type TableDataGridProps = {
  tableId: string;
  columns: ColumnResponse[];
  rowPages: RowListResponse[];
  total: number;
  isFetchingRows?: boolean;
  resetKey?: number;
  filterActive?: boolean;
  onVisibleRangeChange: (startIndex: number, endIndex: number) => void;
};

const virtualRowEstimate = 44;

export function TableDataGrid({
  tableId,
  columns: schemaColumns,
  rowPages,
  total,
  isFetchingRows = false,
  resetKey = 0,
  filterActive = false,
  onVisibleRangeChange,
}: TableDataGridProps) {
  const queryClient = useQueryClient();
  const [renameColumn, setRenameColumn] = useState<ColumnResponse | null>(null);
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<ColumnResponse | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const [pendingRuns, setPendingRuns] = useState<Set<string>>(() => new Set());
  const [inspected, setInspected] = useState<{ rowId: string; columnId: string } | null>(null);
  const [sheriffSelection, setSheriffSelection] = useState<SheriffSelection | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const sheriffAnchorRef = useRef<SheriffAnchor | null>(null);
  const orderedRowIdsRef = useRef<string[]>([]);
  const columnsRef = useRef(schemaColumns);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  columnsRef.current = schemaColumns;

  const { rows, rowByVirtualIndex, virtualIndexByRowId } = useMemo(() => {
    const indexedRows = new Map<number, RowResponse>();
    for (const page of rowPages) {
      page.items.forEach((row, index) => indexedRows.set(page.offset + index, row));
    }
    const orderedEntries = [...indexedRows.entries()].sort(([left], [right]) => left - right);
    return {
      rows: orderedEntries.map(([, row]) => row),
      rowByVirtualIndex: indexedRows,
      virtualIndexByRowId: new Map(orderedEntries.map(([index, row]) => [row.id, index])),
    };
  }, [rowPages]);

  const saveCell = useMutation({
    mutationFn: ({ rowId, columnId, value }: { rowId: string; columnId: string; value: string | boolean | null }) =>
      updateRow(tableId, rowId, { values: { [columnId]: value } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
    },
  });

  const runSheriff = useMutation({
    mutationFn: ({
      rowIds,
      columnId,
      overwrite,
    }: {
      rowIds: string[];
      columnId: string;
      overwrite: boolean;
    }) => startSheriffRun(tableId, columnId, { row_ids: rowIds, overwrite }),
    onMutate: ({ rowIds, columnId }) => {
      setPendingRuns((current) => {
        const next = new Set(current);
        for (const rowId of rowIds) {
          next.add(sheriffRunKey(rowId, columnId));
        }
        return next;
      });
    },
    onSuccess: async (_run, { rowIds, columnId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) }),
        queryClient.invalidateQueries({ queryKey: tableKeys.rowList(tableId) }),
      ]);
      setPendingRuns((current) => {
        const next = new Set(current);
        for (const rowId of rowIds) {
          next.delete(sheriffRunKey(rowId, columnId));
        }
        return next;
      });
    },
    onError: (_error, { rowIds, columnId }) => {
      setPendingRuns((current) => {
        const next = new Set(current);
        for (const rowId of rowIds) {
          next.delete(sheriffRunKey(rowId, columnId));
        }
        return next;
      });
    },
  });

  const removeColumn = useMutation({
    mutationFn: (columnId: string) => deleteColumn(tableId, columnId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      setDeleteColumnTarget(null);
    },
  });

  const removeRow = useMutation({
    mutationFn: (rowId: string) => deleteRow(tableId, rowId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      setDeleteRowId(null);
    },
  });

  const hideColumn = useMutation({
    mutationFn: (columnId: string) => updateColumn(tableId, columnId, { hidden: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
    },
  });

  const moveColumns = useMutation({
    mutationFn: (columnIds: string[]) => reorderColumns(tableId, columnIds),
    onMutate: async (columnIds) => {
      await queryClient.cancelQueries({ queryKey: tableKeys.detail(tableId) });
      const previous = queryClient.getQueryData<TableResponse>(tableKeys.detail(tableId));
      if (previous) {
        const byId = new Map(previous.columns.map((column) => [column.id, column]));
        queryClient.setQueryData<TableResponse>(tableKeys.detail(tableId), {
          ...previous,
          columns: columnIds.flatMap((columnId, position) => {
            const column = byId.get(columnId);
            return column ? [{ ...column, position }] : [];
          }),
        });
      }
      return { previous };
    },
    onError: (_error, _columnIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tableKeys.detail(tableId), context.previous);
      }
    },
    onSuccess: (table) => {
      queryClient.setQueryData(tableKeys.detail(tableId), table);
    },
  });

  const displayColumns = useMemo(() => visibleColumns(schemaColumns), [schemaColumns]);
  const canHideColumn = displayColumns.length > 1;
  const canReorder = displayColumns.length > 1;

  function clearSheriffSelection() {
    sheriffAnchorRef.current = null;
    setSheriffSelection(null);
  }

  function selectSheriffCell(rowId: string, columnId: string) {
    sheriffAnchorRef.current = { columnId, rowId };
    setSheriffSelection({ columnId, rowIds: [rowId] });
  }

  function handleSheriffPointer(event: React.MouseEvent, rowId: string, columnId: string) {
    if (event.shiftKey) {
      const anchor = sheriffAnchorRef.current;
      if (anchor && anchor.columnId === columnId) {
        setSheriffSelection({
          columnId,
          rowIds: rowIdsBetween(orderedRowIdsRef.current, anchor.rowId, rowId),
        });
      } else {
        selectSheriffCell(rowId, columnId);
      }
      return;
    }
    sheriffAnchorRef.current = { columnId, rowId };
    setSheriffSelection(null);
  }

  function handleSheriffContextOpen(rowId: string, columnId: string) {
    const selected =
      sheriffSelection?.columnId === columnId && sheriffSelection.rowIds.includes(rowId);
    if (!selected) {
      selectSheriffCell(rowId, columnId);
    }
  }

  function runSelectedSheriffCells(rowId: string, columnId: string) {
    const rowIds =
      sheriffSelection?.columnId === columnId && sheriffSelection.rowIds.includes(rowId)
        ? sheriffSelection.rowIds
        : [rowId];
    runSheriff.mutate({ rowIds, columnId, overwrite: false });
    clearSheriffSelection();
  }

  const tableColumns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "row-number",
          header: () => <span aria-label="Row number">#</span>,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">
              {(virtualIndexByRowId.get(row.original.id) ?? row.index) + 1}
            </span>
          ),
        }),
        ...displayColumns.map((column) =>
          columnHelper.accessor((row) => row.values[column.id] ?? null, {
            id: column.id,
            // Client-side sorting would only sort the bounded viewport cache,
            // not the complete server result set. Re-enable this with a
            // server-side sort parameter when the rows API supports one.
            enableSorting: false,
            header: ({ header }) => {
              const canSort = header.column.getCanSort();
              const sorted = header.column.getIsSorted();
              return (
                <div className="flex items-center gap-1">
                  <span
                    draggable={canReorder}
                    aria-label={canReorder ? `Reorder ${column.name}` : undefined}
                    className={
                      canReorder
                        ? "cursor-grab touch-none select-none active:cursor-grabbing"
                        : undefined
                    }
                    onDragStart={
                      canReorder
                        ? (event) => {
                            event.dataTransfer.setData("text/plain", column.id);
                            event.dataTransfer.effectAllowed = "move";
                            draggingIdRef.current = column.id;
                            const headerCell = event.currentTarget.closest("[data-column-head]");
                            if (headerCell instanceof HTMLElement) {
                              headerCell.dataset.dragging = "true";
                            }
                          }
                        : undefined
                    }
                    onDragEnd={
                      canReorder
                        ? (event) => {
                            draggingIdRef.current = null;
                            clearColumnDragMarks(event.currentTarget);
                          }
                        : undefined
                    }
                  >
                    {column.name}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label={`${column.name} column actions`} />
                      }
                    >
                      <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {canSort ? (
                        <>
                          {sorted === "asc" ? (
                            <DropdownMenuItem onClick={() => header.column.clearSorting()}>
                              <HugeiconsIcon icon={BanIcon} strokeWidth={2} />
                              remove sort
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => header.column.toggleSorting(false)}>
                              <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
                              asc
                            </DropdownMenuItem>
                          )}
                          {sorted === "desc" ? (
                            <DropdownMenuItem onClick={() => header.column.clearSorting()}>
                              <HugeiconsIcon icon={BanIcon} strokeWidth={2} />
                              remove sort
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => header.column.toggleSorting(true)}>
                              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                              desc
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                        </>
                      ) : null}
                      <DropdownMenuItem onClick={() => setRenameColumn(column)}>Rename</DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canHideColumn || hideColumn.isPending}
                        onClick={() => hideColumn.mutate(column.id)}
                      >
                        Hide
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteColumnTarget(column)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            },
            cell: ({ row, getValue }) =>
              column.type === "sheriff" ? (
                <SheriffCell
                  value={getValue()}
                  pending={pendingRuns.has(sheriffRunKey(row.original.id, column.id))}
                  onRun={() =>
                    runSheriff.mutate({
                      rowIds: [row.original.id],
                      columnId: column.id,
                      overwrite: false,
                    })
                  }
                  onOpen={() => setInspected({ rowId: row.original.id, columnId: column.id })}
                />
              ) : column.type === "boolean" ? (
                <BooleanCell
                  value={getValue()}
                  disabled={saveCell.isPending}
                  onSave={(value) =>
                    saveCell.mutate({ rowId: row.original.id, columnId: column.id, value })
                  }
                />
              ) : (
                <EditableTextCell
                  value={getValue()}
                  disabled={saveCell.isPending}
                  onSave={(value) =>
                    saveCell.mutate({ rowId: row.original.id, columnId: column.id, value })
                  }
                />
              ),
          }),
        ),
        columnHelper.display({
          id: "row-actions",
          header: () => <span className="sr-only">Row actions</span>,
          cell: ({ row }) => (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}
                >
                  <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteRowId(row.original.id)}>
                    Delete row
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }),
      ]),
    [canHideColumn, canReorder, displayColumns, hideColumn, pendingRuns, runSheriff, saveCell, virtualIndexByRowId],
  );

  const table = useTable({
    features: tableGridFeatures,
    columns: tableColumns,
    data: rows,
    getRowId: (row) => row.id,
  });

  const tableRowsById = new Map(table.getRowModel().rows.map((row) => [row.id, row]));
  orderedRowIdsRef.current = [...rowByVirtualIndex.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, row]) => row.id);

  const rowVirtualizer = useVirtualizer({
    count: total,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => virtualRowEstimate,
    overscan: 12,
    getItemKey: (index) => index,
    // React 19 can warn when flushSync runs inside lifecycle work. Slightly
    // delayed measurement is preferable here and keeps fast scrolling smooth.
    useFlushSync: false,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const firstVirtualIndex = virtualRows[0]?.index ?? 0;
  const lastVirtualIndex = virtualRows.at(-1)?.index ?? 0;
  const topPadding = virtualRows[0]?.start ?? 0;
  const bottomPadding = Math.max(
    0,
    rowVirtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0),
  );

  useEffect(() => {
    if (total > 0) {
      onVisibleRangeChange(firstVirtualIndex, lastVirtualIndex);
    }
  }, [firstVirtualIndex, lastVirtualIndex, onVisibleRangeChange, total]);

  useEffect(() => {
    rowVirtualizer.scrollToOffset(0);
    clearSheriffSelection();
  }, [resetKey, rowVirtualizer, tableId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        clearSheriffSelection();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest("[data-sheriff-cell]")) {
        return;
      }
      if (target.closest("[data-slot='context-menu-content']")) {
        return;
      }
      clearSheriffSelection();
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const inspectedColumn = inspected
    ? schemaColumns.find((column) => column.id === inspected.columnId)
    : undefined;
  const inspectedRow = inspected ? rows.find((row) => row.id === inspected.rowId) : undefined;
  const inspectedInFlight = inspected
    ? sheriffInFlightStatus(
        inspectedRow?.values[inspected.columnId],
        pendingRuns.has(sheriffRunKey(inspected.rowId, inspected.columnId)),
      )
    : null;

  if (displayColumns.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
        <p className="text-sm font-medium text-foreground">All columns are hidden</p>
        <p className="text-sm text-muted-foreground">Show a column to see the grid again.</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card">
        <Table
          containerRef={scrollContainerRef}
          containerClassName="max-h-[70vh] overflow-auto"
        >
          <TableHeader className="sticky top-0 z-30 bg-card [&_tr]:bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isRowNumber = header.id === "row-number";
                  const isColumnHeader = header.id !== "row-actions" && !isRowNumber;
                  return (
                    <TableHead
                      key={header.id}
                      data-column-head={isColumnHeader ? header.id : undefined}
                      className={cn(
                        isRowNumber && rowNumberHeaderClass,
                        isColumnHeader &&
                          "data-[dragging=true]:opacity-50 data-[drop-target=true]:shadow-[inset_2px_0_0_0_currentColor]",
                      )}
                      onDragOver={
                        isColumnHeader
                          ? (event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                              const sourceId = draggingIdRef.current;
                              if (!sourceId || sourceId === header.id) {
                                return;
                              }
                              const headerCell = event.currentTarget;
                              if (headerCell.dataset.dropTarget === "true") {
                                return;
                              }
                              clearColumnDropTargets(headerCell);
                              headerCell.dataset.dropTarget = "true";
                            }
                          : undefined
                      }
                      onDrop={
                        isColumnHeader
                          ? (event) => {
                              event.preventDefault();
                              const sourceId =
                                event.dataTransfer.getData("text/plain") || draggingIdRef.current;
                              draggingIdRef.current = null;
                              clearColumnDragMarks(event.currentTarget);
                              if (!sourceId) {
                                return;
                              }
                              const nextIds = reorderVisibleColumns(
                                columnsRef.current,
                                sourceId,
                                header.id,
                              );
                              if (nextIds) {
                                moveColumns.mutate(nextIds);
                              }
                            }
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {total > 0 ? (
              <>
                {topPadding > 0 ? (
                  <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                    <TableCell
                      colSpan={tableColumns.length}
                      className="border-0 p-0"
                      style={{ height: topPadding }}
                    />
                  </TableRow>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const rowData = rowByVirtualIndex.get(virtualRow.index);
                  const row = rowData ? tableRowsById.get(rowData.id) : undefined;

                  if (!row) {
                    return (
                      <TableRow
                        key={virtualRow.key}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        aria-busy="true"
                        className="h-11 hover:bg-transparent"
                      >
                        <TableCell className={rowNumberColumnClass}>
                          <span className="tabular-nums text-muted-foreground">
                            {virtualRow.index + 1}
                          </span>
                        </TableCell>
                        {displayColumns.map((column) => (
                          <TableCell key={column.id}>
                            <span className="block h-3.5 w-24 animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                        <TableCell>
                          <span className="sr-only">Loading row</span>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      className="group h-11"
                    >
                      {row.getAllCells().map((cell) => {
                        if (cell.column.id === "row-number") {
                          return (
                            <TableCell key={cell.id} className={rowNumberColumnClass}>
                              <table.FlexRender cell={cell} />
                            </TableCell>
                          );
                        }

                        const schemaColumn = schemaColumns.find(
                          (column) => column.id === cell.column.id,
                        );
                        if (schemaColumn?.type === "sheriff") {
                          const selected =
                            sheriffSelection?.columnId === schemaColumn.id &&
                            sheriffSelection.rowIds.includes(row.original.id);
                          const selectedCount = selected ? sheriffSelection.rowIds.length : 1;
                          return (
                            <TableCell
                              key={cell.id}
                              data-sheriff-cell=""
                              aria-selected={selected || undefined}
                              className={cn(
                                "p-0",
                                selected && "bg-primary/10 ring-1 ring-inset ring-primary/25",
                              )}
                              onMouseDown={(event) => {
                                if (event.button !== 0) {
                                  return;
                                }
                                if (event.shiftKey) {
                                  event.preventDefault();
                                }
                                handleSheriffPointer(event, row.original.id, schemaColumn.id);
                              }}
                            >
                              <ContextMenu
                                onOpenChange={(open) => {
                                  if (open) {
                                    handleSheriffContextOpen(row.original.id, schemaColumn.id);
                                  }
                                }}
                              >
                                <ContextMenuTrigger className="block select-none p-2">
                                  <table.FlexRender cell={cell} />
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    disabled={runSheriff.isPending}
                                    onClick={() =>
                                      runSelectedSheriffCells(row.original.id, schemaColumn.id)
                                    }
                                  >
                                    <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />
                                    Run {selectedCount} selected{" "}
                                    {selectedCount === 1 ? "cell" : "cells"}
                                  </ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={cell.id}>
                            <table.FlexRender cell={cell} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                {bottomPadding > 0 ? (
                  <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                    <TableCell
                      colSpan={tableColumns.length}
                      className="border-0 p-0"
                      style={{ height: bottomPadding }}
                    />
                  </TableRow>
                ) : null}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center text-muted-foreground">
                  {filterActive
                    ? "No rows match the current filters."
                    : "No rows yet. Add a row to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {moveColumns.error || hideColumn.error || runSheriff.error ? (
        <p className="text-sm text-destructive">
          {mutationErrorMessage(
            moveColumns.error,
            moveColumns.isError ? "Failed to reorder columns" : "",
          ) ||
            mutationErrorMessage(hideColumn.error, hideColumn.isError ? "Failed to hide column" : "") ||
            mutationErrorMessage(runSheriff.error, runSheriff.isError ? "Failed to run research" : "")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? filterActive
              ? "0 rows match filters"
              : "0 rows"
            : `${total} rows${filterActive ? " (filtered)" : ""}`}
        </p>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isFetchingRows ? "Loading rows…" : `${rows.length} rows cached near the viewport`}
        </p>
      </div>

      <RenameColumnDialog
        open={renameColumn !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameColumn(null);
          }
        }}
        tableId={tableId}
        column={renameColumn}
      />

      <SheriffRunDrawer
        open={inspected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setInspected(null);
            if (!runSheriff.isPending) {
              runSheriff.reset();
            }
          }
        }}
        columnName={inspectedColumn?.name ?? "Sheriff"}
        columnId={inspected?.columnId ?? ""}
        value={inspectedRow?.values[inspected?.columnId ?? ""]}
        columns={schemaColumns}
        inFlight={inspectedInFlight}
        rerunPending={
          inspected
            ? runSheriff.isPending &&
              Boolean(runSheriff.variables?.rowIds.includes(inspected.rowId)) &&
              runSheriff.variables?.columnId === inspected.columnId
            : false
        }
        error={
          inspected &&
          runSheriff.variables?.rowIds.includes(inspected.rowId) &&
          runSheriff.variables?.columnId === inspected.columnId
            ? mutationErrorMessage(
                runSheriff.error,
                runSheriff.isError ? "Failed to run research" : "",
              )
            : null
        }
        onRerun={() => {
          if (!inspected) {
            return;
          }
          runSheriff.mutate({
            rowIds: [inspected.rowId],
            columnId: inspected.columnId,
            overwrite: true,
          });
        }}
      />

      <ConfirmDeleteDialog
        open={deleteColumnTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removeColumn.isPending) {
            setDeleteColumnTarget(null);
            removeColumn.reset();
          }
        }}
        title="Delete column"
        description={
          deleteColumnTarget
            ? `Delete “${deleteColumnTarget.name}”? Values in this column will be removed.`
            : "Delete this column?"
        }
        isPending={removeColumn.isPending}
        error={mutationErrorMessage(
          removeColumn.error,
          removeColumn.isError ? "Failed to delete column" : "",
        )}
        onConfirm={() => {
          if (deleteColumnTarget) {
            removeColumn.mutate(deleteColumnTarget.id);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={deleteRowId !== null}
        onOpenChange={(open) => {
          if (!open && !removeRow.isPending) {
            setDeleteRowId(null);
            removeRow.reset();
          }
        }}
        title="Delete row"
        description="Delete this row? This cannot be undone."
        isPending={removeRow.isPending}
        error={mutationErrorMessage(removeRow.error, removeRow.isError ? "Failed to delete row" : "")}
        onConfirm={() => {
          if (deleteRowId) {
            removeRow.mutate(deleteRowId);
          }
        }}
      />
    </>
  );
}
