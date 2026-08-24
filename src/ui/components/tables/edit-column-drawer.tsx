import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  mutationErrorMessage,
  parseEmailEnrichmentConfig,
  tableKeys,
  updateColumn,
  type ColumnResponse,
  type EmailEnrichmentConfig,
} from "@/lib/tables";
import { EmailEnrichmentColumnForm } from "@/ui/components/tables/email-enrichment-column-form";
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
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

type EditColumnDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  column: ColumnResponse | null;
  columns: ColumnResponse[];
};

export function EditColumnDrawer({
  open,
  onOpenChange,
  tableId,
  column,
  columns,
}: EditColumnDrawerProps) {
  const queryClient = useQueryClient();
  const config = useMemo(
    () => (column?.type === "email_enrichment" ? parseEmailEnrichmentConfig(column.config) : null),
    [column],
  );
  const excludeColumnIds = useMemo(
    () => (column ? columns.filter((entry) => entry.source_column_id === column.id).map((entry) => entry.id) : []),
    [column, columns],
  );

  const save = useMutation({
    mutationFn: (input: { name: string; email_enrichment: EmailEnrichmentConfig }) => {
      if (!column) {
        throw new Error("Column is required");
      }
      return updateColumn(tableId, column.id, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.rowList(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      onOpenChange(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && save.isPending) {
      return;
    }
    if (!nextOpen) {
      save.reset();
    }
    onOpenChange(nextOpen);
  }

  const error = mutationErrorMessage(save.error, save.isError ? "Failed to update column" : "");

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>Edit column</DrawerTitle>
          <DrawerDescription>
            Update providers, mappings, and whether catch-all emails count as valid.
          </DrawerDescription>
          <DrawerClose
            disabled={save.isPending}
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        {column && config ? (
          <EmailEnrichmentColumnForm
            key={column.id}
            columns={columns}
            excludeColumnIds={excludeColumnIds}
            initialName={column.name}
            initialConfig={config}
            acceptCatchallLocked={config.accept_catchall}
            idPrefix="edit-email-enrichment"
            pending={save.isPending}
            error={error}
            submitLabel="Save"
            pendingLabel="Saving…"
            onCancel={() => handleOpenChange(false)}
            onSubmit={(input) => save.mutate(input)}
          />
        ) : open ? (
          <>
            <p className="p-4 text-sm text-muted-foreground">
              {column ? "This column's settings could not be loaded." : "Select a column to edit."}
            </p>
            <DrawerFooter className="flex-row justify-end">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
