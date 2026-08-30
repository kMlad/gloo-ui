import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  formatPropertyValue,
  getLead,
  hrefFromUrl,
  leadDisplayName,
  leadKeys,
  leadPhone,
  phoneSourceLabel,
  propertyEntries,
  replyTypeLabel,
  type LeadListItem,
} from "@/lib/leads";
import { formatTableDate, mutationErrorMessage } from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/ui/components/ui/collapsible";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/ui/components/ui/drawer";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Cancel01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons";

type LeadDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  summary?: LeadListItem | null;
};

export function LeadDetailDrawer({
  open,
  onOpenChange,
  leadId,
  summary,
}: LeadDetailDrawerProps) {
  const detailQuery = useQuery({
    queryKey: leadKeys.detail(leadId ?? ""),
    queryFn: ({ signal }) => getLead(leadId ?? "", signal),
    enabled: open && Boolean(leadId),
  });

  const lead = detailQuery.data?.lead;
  const conversations = detailQuery.data?.conversations ?? [];
  const headerLead = lead ?? (summary?.id === leadId ? summary : null);
  const title = headerLead ? leadDisplayName(headerLead) : "Lead";
  const email = headerLead?.email ?? "";
  const error = mutationErrorMessage(
    detailQuery.error,
    detailQuery.isError ? "Failed to load lead" : "",
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle className="truncate">{title}</DrawerTitle>
          <DrawerDescription className="truncate">
            {email || "Imported SmartLead contact and reply history."}
          </DrawerDescription>
          <DrawerClose
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          {detailQuery.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-4 h-4 w-1/4" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : lead ? (
            <>
              <Section label="Contact">
                <dl className="flex flex-col gap-2">
                  <Field label="Email" value={lead.email} />
                  <Field label="Company" value={lead.company_name} />
                  <Field label="Location" value={lead.location} />
                  <LinkField label="LinkedIn" href={hrefFromUrl(lead.linkedin_profile)} />
                  <LinkField label="Website" href={hrefFromUrl(lead.website)} />
                  <LinkField label="Company URL" href={hrefFromUrl(lead.company_url)} />
                </dl>
              </Section>

              <Section label="Phone">
                {leadPhone(lead) ? (
                  <dl className="flex flex-col gap-2">
                    <Field
                      label="Enriched"
                      value={
                        lead.enriched_phone_number
                          ? `${lead.enriched_phone_number}${
                              phoneSourceLabel(lead.phone_source)
                                ? ` · ${phoneSourceLabel(lead.phone_source)}`
                                : ""
                            }`
                          : null
                      }
                    />
                    <Field label="SmartLead" value={lead.smartlead_phone_number} />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No phone number yet.</p>
                )}
              </Section>

              <PropertySection label="Properties" record={lead.properties} />
              <PropertySection label="Custom properties" record={lead.custom_properties} />

              <Section label="Conversations">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {conversations.map((conversation, index) => {
                      const replies = conversation.replies ?? [];
                      const replyLabel = replyTypeLabel(conversation.reply_type) ?? "Uncategorized";
                      return (
                        <Collapsible
                          key={conversation.id}
                          defaultOpen={index === 0}
                          className="group rounded-lg border border-border/70 bg-background/60"
                        >
                          <CollapsibleTrigger className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left">
                            <div className="min-w-0 flex flex-col gap-0.5">
                              <p className="text-sm font-medium text-foreground">{replyLabel}</p>
                              <p className="text-xs text-muted-foreground">
                                Campaign {conversation.smartlead_campaign_id ?? "—"}
                                {conversation.qualified_at
                                  ? ` · ${formatTableDate(conversation.qualified_at)}`
                                  : ""}
                                {` · ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                              </p>
                            </div>
                            <HugeiconsIcon
                              icon={ArrowDown01Icon}
                              strokeWidth={2}
                              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-data-open:rotate-180"
                            />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="border-t border-border/70 px-3 py-3">
                            {conversation.positive_category_name ? (
                              <p className="mb-3 text-xs text-muted-foreground">
                                Category: {conversation.positive_category_name}
                              </p>
                            ) : null}
                            {replies.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No replies stored.</p>
                            ) : (
                              <ol className="flex flex-col gap-3">
                                {replies.map((reply) => (
                                  <li
                                    key={reply.id}
                                    className="flex flex-col gap-1.5 rounded-md bg-muted/40 px-2.5 py-2"
                                  >
                                    {reply.subject ? (
                                      <p className="text-sm font-medium text-foreground">
                                        {reply.subject}
                                      </p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                      {[reply.sent_from, reply.sent_to].filter(Boolean).length > 0
                                        ? `${reply.sent_from ?? "Unknown"} → ${reply.sent_to ?? "Unknown"}`
                                        : "Sender unknown"}
                                      {reply.received_at
                                        ? ` · ${formatTableDate(reply.received_at)}`
                                        : ""}
                                    </p>
                                    {reply.body ? (
                                      <p className="whitespace-pre-wrap text-sm text-foreground/90">
                                        {reply.body}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">Empty body.</p>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </Section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a lead to inspect.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) {
    return null;
  }
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

function LinkField({ label, href }: { label: string; href: string | null }) {
  if (!href) {
    return null;
  }
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 text-sm text-foreground underline-offset-4 hover:underline"
        >
          <HugeiconsIcon
            icon={LinkSquare02Icon}
            strokeWidth={2}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="truncate">{href.replace(/^https?:\/\//i, "")}</span>
        </a>
      </dd>
    </div>
  );
}

function PropertySection({
  label,
  record,
}: {
  label: string;
  record: Record<string, unknown> | null | undefined;
}) {
  const entries = propertyEntries(record);
  if (entries.length === 0) {
    return null;
  }
  return (
    <Section label={label}>
      <dl className="flex flex-col gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-xs text-muted-foreground">{key}</dt>
            <dd className="min-w-0 truncate text-sm text-foreground">{formatPropertyValue(value)}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
