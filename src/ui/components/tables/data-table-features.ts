import {
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

export const tableListFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

export type TableListFeatures = typeof tableListFeatures;

export const tableGridFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

export type TableGridFeatures = typeof tableGridFeatures;
