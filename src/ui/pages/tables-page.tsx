import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { listTables, mutationErrorMessage, tableKeys } from "@/lib/tables";
import { CreateTableDialog } from "@/ui/components/tables/create-table-dialog";
import { ImportCsvDialog } from "@/ui/components/tables/import-csv-dialog";
import { TablesList } from "@/ui/components/tables/tables-list";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Upload01Icon } from "@hugeicons/core-free-icons";

export function TablesPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const tablesQuery = useQuery({
    queryKey: tableKeys.all,
    queryFn: listTables,
  });

  const tables = tablesQuery.data?.items ?? [];
  const error = mutationErrorMessage(
    tablesQuery.error,
    tablesQuery.isError ? "Failed to load tables" : "",
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Tables</h1>
          <p className="text-sm text-muted-foreground">Create, import, and manage workspace tables.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
            <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} />
            Import CSV
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            New table
          </Button>
        </div>
      </div>

      {tablesQuery.isPending ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : tables.length === 0 ? (
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
          <p className="text-sm font-medium text-foreground">No tables yet</p>
          <p className="text-sm text-muted-foreground">Create a table or import a CSV to get started.</p>
        </div>
      ) : (
        <TablesList tables={tables} />
      )}

      <CreateTableDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(tableId) => {
          setCreateOpen(false);
          void navigate(`/tables/${tableId}`);
        }}
      />
      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(tableId) => {
          setImportOpen(false);
          void navigate(`/tables/${tableId}`);
        }}
      />
    </div>
  );
}
