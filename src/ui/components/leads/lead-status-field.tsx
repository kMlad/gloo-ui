import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  leadKeys,
  updateLead,
  type LeadStatus,
} from "@/lib/leads";
import { speedToLeadKeys } from "@/lib/speed-to-lead";
import { mutationErrorMessage } from "@/lib/tables";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";

export function LeadStatusField({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (next: LeadStatus) => updateLead(leadId, { status: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
      await queryClient.invalidateQueries({ queryKey: leadKeys.all });
      await queryClient.invalidateQueries({ queryKey: speedToLeadKeys.all });
    },
  });
  const error = mutationErrorMessage(save.error, save.isError ? "Failed to update status" : "");

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</h3>
      <div>
        <label htmlFor="lead-detail-status" className="sr-only">
          Lead status
        </label>
        <Select
          value={status}
          disabled={save.isPending}
          onValueChange={(value, details) => {
            // Base UI also emits changes for autofill, closed-trigger typeahead,
            // and internal value reconciliation. Only an item activation saves.
            if (details.reason !== "item-press" || !value || value === status || save.isPending) {
              details.cancel();
              return;
            }
            save.mutate(value);
          }}
        >
          <SelectTrigger id="lead-detail-status" size="lg" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {LEAD_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
