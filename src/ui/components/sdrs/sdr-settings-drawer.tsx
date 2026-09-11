import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ISO_WEEKDAY_LABELS,
  ISO_WEEKDAYS,
  SDR_TIMEZONE,
  sdrKeys,
  sdrSettingsFormSchema,
  sdrSettingsFormValues,
  sdrSettingsUpdateFromForm,
  timeInputValue,
  uniqueSortedWorkDays,
  updateSdrSettings,
  withSdrSettings,
  type IsoWeekday,
  type SdrListItem,
} from "@/lib/sdrs";
import { mutationErrorMessage } from "@/lib/tables";
import { cn } from "@/lib/utils";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

type SdrSettingsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sdr: SdrListItem | null;
};

export function SdrSettingsDrawer({ open, onOpenChange, sdr }: SdrSettingsDrawerProps) {
  const queryClient = useQueryClient();
  const [slackChannelId, setSlackChannelId] = useState("");
  const [workDays, setWorkDays] = useState<IsoWeekday[]>([]);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sdr) {
      return;
    }
    const values = sdrSettingsFormValues(sdr.settings);
    setSlackChannelId(values.slack_channel_id);
    setWorkDays(uniqueSortedWorkDays(values.work_days));
    setWorkStart(timeInputValue(values.work_start));
    setWorkEnd(timeInputValue(values.work_end));
    setValidationError(null);
  }, [open, sdr]);

  const save = useMutation({
    mutationFn: (sdrId: string) => {
      const parsed = sdrSettingsFormSchema.safeParse({
        slack_channel_id: slackChannelId,
        work_days: workDays,
        work_start: workStart,
        work_end: workEnd,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid SDR settings");
      }
      return updateSdrSettings(sdrId, sdrSettingsUpdateFromForm(parsed.data));
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData<SdrListItem[]>(sdrKeys.all, (current) =>
        current ? withSdrSettings(current, updated) : current,
      );
      await queryClient.invalidateQueries({ queryKey: sdrKeys.all });
      onOpenChange(false);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && save.isPending) {
      return;
    }
    if (!nextOpen) {
      save.reset();
      setValidationError(null);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sdr) {
      return;
    }
    setValidationError(null);
    save.reset();

    const parsed = sdrSettingsFormSchema.safeParse({
      slack_channel_id: slackChannelId,
      work_days: workDays,
      work_start: workStart,
      work_end: workEnd,
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid SDR settings");
      return;
    }

    save.mutate(sdr.id);
  }

  function toggleWorkDay(day: IsoWeekday) {
    setWorkDays((current) =>
      uniqueSortedWorkDays(
        current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
      ),
    );
  }

  const error =
    validationError ??
    mutationErrorMessage(save.error, save.isError ? "Failed to save SDR settings" : "");
  const unconfigured = sdr != null && sdr.settings == null;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle className="min-w-0 truncate">{sdr?.email ?? "SDR"}</DrawerTitle>
          <DrawerDescription>
            Slack alerts go to this channel. Phone enrichment only runs during working hours.
          </DrawerDescription>
          <DrawerClose
            disabled={save.isPending}
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        {sdr ? (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <FieldGroup className="flex-1 gap-4 overflow-y-auto p-4">
              {unconfigured ? (
                <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  No hours are set yet, so enrichment runs at any time. Saving applies the schedule
                  below.
                </p>
              ) : null}

              <Field>
                <FieldLabel htmlFor="sdr-slack-channel" className="text-xs text-muted-foreground">
                  Slack channel ID
                </FieldLabel>
                <Input
                  id="sdr-slack-channel"
                  value={slackChannelId}
                  onChange={(event) => setSlackChannelId(event.target.value)}
                  placeholder="C0123456789"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 rounded-lg px-3 font-mono text-sm"
                />
                <FieldDescription>
                  Starts with C, G, or D. Invite the Gloo bot to the channel. Leave blank to use the
                  workspace default.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel className="text-xs text-muted-foreground">Work days</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {ISO_WEEKDAYS.map((day) => {
                    const selected = workDays.includes(day);
                    return (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        aria-pressed={selected}
                        disabled={save.isPending}
                        className={cn("min-w-10", selected ? undefined : "text-muted-foreground")}
                        onClick={() => toggleWorkDay(day)}
                      >
                        {ISO_WEEKDAY_LABELS[day]}
                      </Button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="sdr-work-start" className="text-xs text-muted-foreground">
                    Starts
                  </FieldLabel>
                  <Input
                    id="sdr-work-start"
                    type="time"
                    step={60}
                    value={workStart}
                    disabled={save.isPending}
                    onChange={(event) => setWorkStart(event.target.value)}
                    className="h-9 rounded-lg px-3 text-sm"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="sdr-work-end" className="text-xs text-muted-foreground">
                    Ends
                  </FieldLabel>
                  <Input
                    id="sdr-work-end"
                    type="time"
                    step={60}
                    value={workEnd}
                    disabled={save.isPending}
                    onChange={(event) => setWorkEnd(event.target.value)}
                    className="h-9 rounded-lg px-3 text-sm"
                  />
                </Field>
              </div>
              <FieldDescription>
                Same-day window in {SDR_TIMEZONE}. Alerts still post outside these hours; enrichment
                waits until they&apos;re working.
              </FieldDescription>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </FieldGroup>
            <DrawerFooter className="flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DrawerFooter>
          </form>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
