import { useEffect, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { type SdrListItem } from "@/lib/sdrs";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

type AssignLeadsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  sdrs: SdrListItem[];
  sdrsLoading: boolean;
  sdrsError: string;
  error: string;
  isPending: boolean;
  onAssign: (sdrId: string) => void;
};

export function AssignLeadsDialog({
  open,
  onOpenChange,
  selectedCount,
  sdrs,
  sdrsLoading,
  sdrsError,
  error,
  isPending,
  onAssign,
}: AssignLeadsDialogProps) {
  const [sdrId, setSdrId] = useState("");

  useEffect(() => {
    if (open) {
      setSdrId("");
    }
  }, [open]);

  const leadLabel = selectedCount === 1 ? "lead" : "leads";
  const canSubmit = Boolean(sdrId) && selectedCount > 0 && !isPending && !sdrsLoading;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      return;
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdrId) {
      return;
    }
    onAssign(sdrId);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Assign leads</DialogTitle>
          <DialogDescription>
            Assign {selectedCount} {leadLabel} to an SDR.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="assign-sdr" className="text-xs text-muted-foreground">
                SDR
              </FieldLabel>
              {sdrsLoading ? (
                <p className="text-sm text-muted-foreground">Loading SDRs…</p>
              ) : sdrsError ? (
                <p className="text-sm text-destructive">{sdrsError}</p>
              ) : sdrs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No SDR users to assign. Invite an SDR first.
                </p>
              ) : (
                <div className="relative">
                  <select
                    id="assign-sdr"
                    className={cn(nativeSelectClass, "w-full")}
                    value={sdrId}
                    disabled={isPending}
                    onChange={(event) => setSdrId(event.target.value)}
                    required
                  >
                    <option value="">Select an SDR</option>
                    {sdrs.map((sdr) => (
                      <option key={sdr.id} value={sdr.id}>
                        {sdr.email}
                      </option>
                    ))}
                  </select>
                  <HugeiconsIcon
                    icon={UnfoldMoreIcon}
                    strokeWidth={2}
                    className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              )}
            </Field>
          </FieldGroup>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? "Assigning…" : `Assign ${selectedCount} ${leadLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
