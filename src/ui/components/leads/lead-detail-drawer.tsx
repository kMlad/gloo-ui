import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  formatMessageTime,
  formatPropertyValue,
  getLead,
  hrefFromUrl,
  leadDisplayName,
  leadKeys,
  leadPhone,
  messageDirection,
  propertyEntries,
  replyTypeLabel,
  type LeadConversation,
  type LeadListItem,
  type LeadReply,
} from "@/lib/leads";
import { omitLeadingSubject, parseMessageBody, type MessageBlock, type MessageInline } from "@/lib/message-body";
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
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Cancel01Icon,
  LinkSquare02Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";

type LeadDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  summary?: LeadListItem | null;
};

type ThreadMessage = LeadReply & {
  conversation: LeadConversation;
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
  const linkedinHref = hrefFromUrl(headerLead?.linkedin_profile);
  const websiteHref = hrefFromUrl(headerLead?.website) ?? hrefFromUrl(headerLead?.company_url);
  const companyName = headerLead?.company_name?.trim() || "";
  const location = headerLead?.location?.trim() || "";
  const phone = headerLead ? leadPhone(headerLead) : null;
  const error = mutationErrorMessage(
    detailQuery.error,
    detailQuery.isError ? "Failed to load lead" : "",
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
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
            <>
              <div className="flex shrink-0 flex-col gap-4 px-4 pt-4 pb-3">
                <dl className="flex flex-col gap-2">
                  <IconField icon={Mail01Icon} label="Email" value={lead.email} />
                  <IconField icon={Call02Icon} label="Phone" value={phone} />
                </dl>
                <PropertySection label="Custom properties" record={lead.custom_properties} />
              </div>

              <ConversationThread conversations={conversations} />
            </>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Select a lead to inspect.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ConversationThread({ conversations }: { conversations: LeadConversation[] }) {
  const grouped = conversations.map((conversation) => ({
    conversation,
    messages: [...(conversation.replies ?? [])].sort(compareReceivedAt),
  }));
  const hasMessages = grouped.some((group) => group.messages.length > 0);

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-border/70">
      <h3 className="shrink-0 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Thread
      </h3>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {!hasMessages ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(({ conversation, messages }) => {
              if (messages.length === 0) {
                return null;
              }
              const replyLabel = replyTypeLabel(conversation.reply_type);
              return (
                <div key={conversation.id} className="flex flex-col gap-3">
                  {conversations.length > 1 ? (
                    <p className="sticky top-0 z-10 bg-popover/95 py-1 text-[0.65rem] tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                      {replyLabel ?? "Conversation"}
                      {conversation.smartlead_campaign_id != null
                        ? ` · Campaign ${conversation.smartlead_campaign_id}`
                        : ""}
                    </p>
                  ) : null}
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
  const sender = message.sent_from?.trim();

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg px-3 py-2.5",
        outbound
          ? "ml-6 bg-muted/40"
          : "mr-6 border border-border/70 bg-background",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
          {outbound ? "Sent" : "Received"}
        </p>
        {time ? (
          <time className="shrink-0 text-[0.65rem] text-muted-foreground" dateTime={message.received_at ?? undefined}>
            {time}
          </time>
        ) : null}
      </div>
      {sender ? (
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
          <ListBlock
            key={index}
            ordered={block.ordered}
            items={block.items}
          />
        ) : (
          <p key={index} className="min-w-0 whitespace-pre-wrap">
            <InlineSpans spans={block.spans} />
          </p>
        ),
      )}
    </div>
  );
}

function ListBlock({
  ordered,
  items,
}: {
  ordered: boolean;
  items: MessageInline[][];
}) {
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

function IconField({
  icon,
  label,
  value,
}: {
  icon: typeof Mail01Icon;
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) {
    return null;
  }
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <dt className="shrink-0 text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 truncate text-sm text-foreground">{value}</dd>
    </div>
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
