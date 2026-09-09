import { type ReactNode, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  conversationCampaignName,
  conversationIsHeyReach,
  formatMessageTime,
  formatPropertyValue,
  getLead,
  hrefFromUrl,
  leadDisplayName,
  leadKeys,
  leadPhone,
  leadSourceCampaignLabel,
  linkedinAccountNames,
  messageDirection,
  propertyEntries,
  replyTypeLabel,
  updateLead,
  type LeadConversation,
  type LeadListItem,
  type LeadReply,
  type LeadSource,
} from "@/lib/leads";
import {
  omitLeadingSubject,
  parseMessageBody,
  type MessageBlock,
  type MessageInline,
} from "@/lib/message-body";
import { speedToLeadKeys } from "@/lib/speed-to-lead";
import { mutationErrorMessage } from "@/lib/tables";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/ui/components/ui/drawer";
import { LeadStatusField } from "@/ui/components/leads/lead-status-field";
import { Skeleton } from "@/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowExpand01Icon,
  ArrowShrink01Icon,
  Call02Icon,
  Cancel01Icon,
  Copy01Icon,
  LinkSquare02Icon,
  Mail01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const textareaClass =
  "min-h-24 w-full resize-y rounded-lg border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

type LeadDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  summary?: LeadListItem | null;
  enrichedPhoneOnly?: boolean;
};

type ThreadMessage = LeadReply & {
  conversation: LeadConversation;
};

export function LeadDetailDrawer({
  open,
  onOpenChange,
  leadId,
  summary,
  enrichedPhoneOnly = false,
}: LeadDetailDrawerProps) {
  const [threadExpanded, setThreadExpanded] = useState(false);
  const detailQuery = useQuery({
    queryKey: leadKeys.detail(leadId ?? ""),
    queryFn: ({ signal }) => getLead(leadId ?? "", signal),
    enabled: open && Boolean(leadId),
  });

  const lead = detailQuery.data?.lead;
  const conversations = detailQuery.data?.conversations ?? [];
  const headerLead = lead ?? (summary?.id === leadId ? summary : null);
  const title = headerLead ? leadDisplayName(headerLead) : "Lead";
  const linkedinHref = hrefFromUrl(headerLead?.linkedin_profile);
  const websiteHref = hrefFromUrl(headerLead?.website) ?? hrefFromUrl(headerLead?.company_url);
  const companyName = headerLead?.company_name?.trim() || "";
  const location = headerLead?.location?.trim() || "";
  const phone = (() => {
    if (!headerLead) {
      return null;
    }
    if (enrichedPhoneOnly) {
      return headerLead.enriched_phone_number?.trim() || null;
    }
    return leadPhone(headerLead);
  })();
  const campaignName =
    (lead ? leadSourceCampaignLabel(lead) : null) ??
    (summary?.id === leadId ? leadSourceCampaignLabel(summary) : null);
  const sourceCampaigns =
    (lead?.source_campaigns && lead.source_campaigns.length > 0 ? lead.source_campaigns : null) ??
    (summary?.id === leadId ? summary.source_campaigns : null) ??
    [];
  const linkedinAccounts = linkedinAccountNames(conversations);
  const extraEntries: Array<[string, string]> = [
    ...(campaignName ? [["Campaign", campaignName] as [string, string]] : []),
    ...(linkedinAccounts.length > 0
      ? [["LinkedIn account", linkedinAccounts.join(", ")] as [string, string]]
      : []),
  ];
  const error = mutationErrorMessage(
    detailQuery.error,
    detailQuery.isError ? "Failed to load lead" : "",
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent
        className={
          threadExpanded
            ? "data-[swipe-axis=x]:[--drawer-content-width:calc(100vw-1rem)] data-[swipe-axis=x]:sm:[--drawer-content-width:min(64rem,calc(100vw-1rem))]"
            : "data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]"
        }
      >
        <DrawerHeader className="relative pr-12">
          <DrawerTitle className="min-w-0">
            {linkedinHref ? (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${title} on LinkedIn`}
                className="inline-flex max-w-full items-center gap-1.5 underline-offset-4 hover:underline"
              >
                <span className="truncate">{title}</span>
                <HugeiconsIcon
                  icon={LinkSquare02Icon}
                  strokeWidth={2}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </a>
            ) : (
              <span className="block truncate">{title}</span>
            )}
          </DrawerTitle>
          <DrawerDescription className="min-w-0 text-left text-pretty">
            {companyName || location ? (
              <span className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-x-1.5">
                {companyName ? (
                  websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${companyName} website`}
                      className="inline-flex max-w-full items-center gap-1 text-muted-foreground underline-offset-4 hover:underline"
                    >
                      <span className="truncate">{companyName}</span>
                      <HugeiconsIcon
                        icon={LinkSquare02Icon}
                        strokeWidth={2}
                        className="size-3.5 shrink-0"
                      />
                    </a>
                  ) : (
                    <span className="truncate">{companyName}</span>
                  )
                ) : null}
                {companyName && location ? <span aria-hidden="true">·</span> : null}
                {location ? <span className="truncate">{location}</span> : null}
              </span>
            ) : (
              <span className="sr-only">Lead details</span>
            )}
          </DrawerDescription>
          <DrawerClose
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {detailQuery.isPending ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-4 w-1/4" />
              <Skeleton className="min-h-0 flex-1 w-full" />
            </div>
          ) : error ? (
            <p className="p-4 text-sm text-destructive">{error}</p>
          ) : lead ? (
            <div
              className={cn(
                "flex min-h-0 flex-1",
                threadExpanded ? "flex-col md:flex-row" : "flex-col",
              )}
            >
              <div
                className={cn(
                  "flex flex-col gap-4 px-4 pt-4 pb-3",
                  threadExpanded
                    ? "min-h-0 max-h-[38%] shrink-0 overflow-y-auto overscroll-contain border-b border-border/70 md:max-h-none md:w-80 md:shrink-0 md:self-stretch md:border-r md:border-b-0"
                    : "shrink-0",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col gap-4",
                    threadExpanded && "sticky top-0 z-10 bg-popover/95 pb-1 backdrop-blur-sm",
                  )}
                >
                  <dl className="flex flex-col gap-2">
                    <IconField icon={Mail01Icon} label="Email" value={lead.email} />
                    <IconField icon={Call02Icon} label="Phone" value={phone} />
                  </dl>
                  <LeadStatusField key={lead.id} leadId={lead.id} status={lead.status ?? "new"} />
                </div>
                <PropertySection
                  label="Custom properties"
                  record={lead.custom_properties}
                  extraEntries={extraEntries}
                />
                <LeadNotesSection leadId={lead.id} notes={lead.notes} />
              </div>

              <ConversationThread
                conversations={conversations}
                sources={sourceCampaigns}
                expanded={threadExpanded}
                onToggleExpand={() => setThreadExpanded((current) => !current)}
              />
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Select a lead to inspect.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ConversationThread({
  conversations,
  sources,
  expanded,
  onToggleExpand,
}: {
  conversations: LeadConversation[];
  sources: LeadSource[];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const grouped = conversations.map((conversation) => ({
    conversation,
    messages: [...(conversation.replies ?? [])].sort(compareReceivedAt),
  }));
  const hasContent = grouped.some(
    ({ conversation, messages }) =>
      messages.length > 0 ||
      conversationIsHeyReach(conversation) ||
      Boolean(conversation.linkedin_sender_name?.trim()),
  );

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        expanded ? "md:border-t-0" : "border-t border-border/70",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Thread
        </h3>
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={expanded ? "Collapse thread" : "Expand thread"}
                  aria-expanded={expanded}
                  onClick={onToggleExpand}
                />
              }
            >
              <HugeiconsIcon
                icon={expanded ? ArrowShrink01Icon : ArrowExpand01Icon}
                strokeWidth={2}
              />
            </TooltipTrigger>
            <TooltipContent side="left">
              {expanded ? "Show compact view" : "Expand thread"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {!hasContent ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(({ conversation, messages }) => {
              const replyLabel = replyTypeLabel(conversation.reply_type);
              const senderName = conversation.linkedin_sender_name?.trim();
              const heyreach = conversationIsHeyReach(conversation);
              const campaignLabel = conversationCampaignName(conversation, sources);
              const showHeader =
                conversations.length > 1 ||
                heyreach ||
                Boolean(senderName) ||
                Boolean(campaignLabel);
              if (messages.length === 0 && !showHeader) {
                return null;
              }
              return (
                <div key={conversation.id} className="flex flex-col gap-3">
                  {showHeader ? (
                    <p className="sticky top-0 z-10 bg-popover/95 py-1 text-[0.65rem] tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                      {replyLabel ?? (heyreach ? "LinkedIn" : "Conversation")}
                      {senderName ? ` · ${senderName}` : ""}
                      {campaignLabel ? ` · ${campaignLabel}` : ""}
                    </p>
                  ) : null}
                  {messages.length > 0 ? (
                    <ol className="flex flex-col gap-2.5">
                      {messages.map((message, index) => {
                        const subject = message.subject?.trim() || "";
                        return (
                          <ThreadMessageItem
                            key={message.id}
                            message={{ ...message, conversation }}
                            showSubject={index === 0 && Boolean(subject)}
                          />
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ThreadMessageItem({
  message,
  showSubject,
}: {
  message: ThreadMessage;
  showSubject: boolean;
}) {
  const outbound = messageDirection(message) === "outbound";
  const subject = message.subject?.trim() || "";
  const blocks = omitLeadingSubject(parseMessageBody(message.body), showSubject ? subject : null);
  const time = formatMessageTime(message.received_at);
  const sender =
    message.sent_from?.trim() ||
    (outbound ? message.conversation.linkedin_sender_name?.trim() : "") ||
    null;

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg px-3 py-2.5",
        outbound ? "ml-6 bg-muted/40" : "mr-6 border border-border/70 bg-background",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
          {outbound ? (sender ?? "Sent") : "Received"}
        </p>
        {time ? (
          <time
            className="shrink-0 text-[0.65rem] text-muted-foreground"
            dateTime={message.received_at ?? undefined}
          >
            {time}
          </time>
        ) : null}
      </div>
      {!outbound && sender ? (
        <p className="truncate text-[0.65rem] text-muted-foreground">{sender}</p>
      ) : null}
      {showSubject ? (
        <div className="mt-1 border-b border-border/70 pb-2.5" aria-label={`Subject: ${subject}`}>
          <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
            Subject
          </p>
          <p className="mt-0.5 min-w-0 text-sm font-medium leading-snug text-foreground">
            {subject}
          </p>
        </div>
      ) : null}
      {blocks.length > 0 ? (
        <MessageBody blocks={blocks} />
      ) : (
        <p className="text-sm text-muted-foreground">Empty message.</p>
      )}
    </li>
  );
}

function MessageBody({ blocks }: { blocks: MessageBlock[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm text-foreground/90">
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ListBlock key={index} ordered={block.ordered} items={block.items} />
        ) : (
          <p key={index} className="min-w-0 whitespace-pre-wrap">
            <InlineSpans spans={block.spans} />
          </p>
        ),
      )}
    </div>
  );
}

function ListBlock({ ordered, items }: { ordered: boolean; items: MessageInline[][] }) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag
      className={cn(
        "min-w-0 space-y-1 pl-4 marker:text-muted-foreground",
        ordered ? "list-decimal" : "list-disc",
      )}
    >
      {items.map((spans, index) => (
        <li key={index} className="min-w-0 whitespace-pre-wrap">
          <InlineSpans spans={spans} />
        </li>
      ))}
    </ListTag>
  );
}

function InlineSpans({ spans }: { spans: MessageInline[] }) {
  return spans.map((span, index) => {
    if (span.type === "text") {
      return <span key={index}>{span.value}</span>;
    }
    const longLabel = span.label.length > 24 || /https?:\/\//i.test(span.label);
    return (
      <a
        key={index}
        href={span.href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "text-foreground underline underline-offset-4 hover:opacity-80",
          longLabel && "inline-block max-w-full break-all align-top",
        )}
      >
        {span.label}
      </a>
    );
  });
}

function compareReceivedAt(a: LeadReply, b: LeadReply) {
  const aTime = a.received_at ? Date.parse(a.received_at) : 0;
  const bTime = b.received_at ? Date.parse(b.received_at) : 0;
  return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
}

function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="shrink-0"
      aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
      onClick={copyValue}
    >
      <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} />
    </Button>
  );
}

function IconField({
  icon,
  label,
  value,
}: {
  icon: typeof Mail01Icon;
  label: string;
  value: string | null | undefined;
}) {
  const text = value?.trim();
  if (!text) {
    return null;
  }
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <dt className="shrink-0 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 truncate text-sm text-foreground">{text}</span>
        <CopyValueButton value={text} label={label} />
      </dd>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</h3>
      {children}
    </section>
  );
}

function LeadNotesSection({ leadId, notes }: { leadId: string; notes: string | null | undefined }) {
  const queryClient = useQueryClient();
  const saved = notes ?? "";
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [leadId, saved]);

  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim();
      return updateLead(leadId, { notes: trimmed.length > 0 ? trimmed : null });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leadKeys.detail(leadId) });
      await queryClient.invalidateQueries({ queryKey: leadKeys.all });
      await queryClient.invalidateQueries({ queryKey: speedToLeadKeys.all });
    },
  });
  const dirty = draft !== saved;
  const error = mutationErrorMessage(save.error, save.isError ? "Failed to save notes" : "");

  return (
    <Section label="Notes">
      <textarea
        className={textareaClass}
        value={draft}
        rows={4}
        placeholder="Add a note"
        disabled={save.isPending}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex items-center justify-end gap-2">
        {error ? <p className="mr-auto text-xs text-destructive">{error}</p> : null}
        <Button
          type="button"
          size="sm"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </Section>
  );
}

function PropertySection({
  label,
  record,
  extraEntries = [],
}: {
  label: string;
  record: Record<string, unknown> | null | undefined;
  extraEntries?: Array<[string, string]>;
}) {
  const extraKeys = new Set(extraEntries.map(([key]) => key));
  const entries = [
    ...extraEntries,
    ...propertyEntries(record).filter(([key]) => !extraKeys.has(key)),
  ];
  if (entries.length === 0) {
    return null;
  }
  return (
    <Section label={label}>
      <TooltipProvider>
        <dl className="flex flex-col gap-2">
          {entries.map(([key, value], index) => {
            const text = typeof value === "string" ? value : formatPropertyValue(value);
            return (
              <div key={`${key}-${index}`} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-xs text-muted-foreground">{key}</dt>
                <dd className="min-w-0 text-sm text-foreground">
                  {extraKeys.has(key) ? (
                    <TruncatedTooltip text={text} />
                  ) : (
                    <span className="block truncate">{text}</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </TooltipProvider>
    </Section>
  );
}

function TruncatedTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        render={<span className="block min-w-0 cursor-default truncate" />}
      >
        {text}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="end"
        className="block max-w-sm whitespace-normal break-words text-left"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
