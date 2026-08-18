import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hiddenColumns, mutationErrorMessage, tableKeys, updateColumn, type ColumnResponse } from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewOffSlashIcon } from "@hugeicons/core-free-icons";

type HiddenColumnsMenuProps = {
  tableId: string;
  columns: ColumnResponse[];
};

export function HiddenColumnsMenu({ tableId, columns }: HiddenColumnsMenuProps) {
  const queryClient = useQueryClient();
  const hidden = hiddenColumns(columns);

  const show = useMutation({
    mutationFn: async (columnIds: string[]) => {
      await Promise.all(columnIds.map((columnId) => updateColumn(tableId, columnId, { hidden: false })));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
    },
  });

  if (hidden.length === 0) {
    return null;
  }

  const error = mutationErrorMessage(show.error, show.isError ? "Failed to show column" : "");
  const label = hidden.length === 1 ? "1 hidden column" : `${hidden.length} hidden columns`;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={show.isPending} />}>
          <HugeiconsIcon icon={ViewOffSlashIcon} strokeWidth={2} />
          {label}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hidden.map((column) => (
            <DropdownMenuItem
              key={column.id}
              disabled={show.isPending}
              onClick={() => show.mutate([column.id])}
            >
              Show {column.name}
            </DropdownMenuItem>
          ))}
          {hidden.length > 1 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={show.isPending} onClick={() => show.mutate(hidden.map((column) => column.id))}>
                Show all
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
