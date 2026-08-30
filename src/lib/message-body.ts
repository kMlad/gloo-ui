export type MessageInline =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

export type MessageBlock =
  | { type: "paragraph"; spans: MessageInline[] }
  | { type: "list"; ordered: boolean; items: MessageInline[][] };

const LIST_ITEM = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/;

export function parseMessageBody(value: string | null | undefined): MessageBlock[] {
  const text = collapseDuplicateBracketLines(toPlainText(value));
  if (!text) {
    return [];
  }
  return blocksFromLines(text);
}

export function omitLeadingSubject(blocks: MessageBlock[], subject: string | null | undefined) {
  const trimmed = subject?.trim();
  if (!trimmed || blocks.length === 0) {
    return blocks;
  }
  const first = blocks[0];
  if (first.type !== "paragraph") {
    return blocks;
  }
  const text = spansToPlainText(first.spans);
  if (subjectMatches(text, trimmed)) {
    return blocks.slice(1);
  }
  const newlineIndex = text.indexOf("\n");
  if (newlineIndex > 0 && subjectMatches(text.slice(0, newlineIndex), trimmed)) {
    return dropLeadingPlainLine(blocks, text.slice(newlineIndex + 1));
  }
  return blocks;
}

function spansToPlainText(spans: MessageInline[]) {
  return spans
    .map((span) => (span.type === "text" ? span.value : span.label))
    .join("")
    .trim();
}

function subjectMatches(value: string, subject: string) {
  const left = value.replace(/^re:\s*/i, "").trim().toLowerCase();
  const right = subject.replace(/^re:\s*/i, "").trim().toLowerCase();
  return left === right;
}

function dropLeadingPlainLine(blocks: MessageBlock[], remainder: string): MessageBlock[] {
  const rest = remainder.trim();
  if (!rest) {
    return blocks.slice(1);
  }
  return [{ type: "paragraph", spans: [{ type: "text", value: rest }] }, ...blocks.slice(1)];
}

function toPlainText(value: string | null | undefined) {
  let text = value?.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim() ?? "";
  if (!text) {
    return "";
  }
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/li>/gi, "")
      .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
        const inner = String(label)
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const decodedHref = decodeEntities(String(href).trim());
        if (!inner || urlsLookSame(inner, decodedHref)) {
          return decodedHref;
        }
        return `${inner}: ${decodedHref}`;
      })
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"');
  }
  return decodeEntities(text)
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collapseDuplicateBracketLines(text: string) {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const bracketOnly = /^\s*\[(https?:\/\/[^\s\]]+)\]\s*$/i.exec(line);
    if (bracketOnly && seen.has(normalizeHref(bracketOnly[1]))) {
      continue;
    }
    for (const match of line.matchAll(/https?:\/\/[^\s<>\]]+/gi)) {
      seen.add(normalizeHref(match[0]));
    }
    kept.push(line);
  }
  return kept.join("\n").trim();
}

function blocksFromLines(text: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    const joined = paragraph.join("\n").trim();
    paragraph = [];
    if (!joined) {
      return;
    }
    const spans = parseInlines(joined);
    if (spans.length > 0) {
      blocks.push({ type: "paragraph", spans });
    }
  };

  const flushList = () => {
    if (!list) {
      return;
    }
    const items = list.items.map(parseInlines).filter((item) => item.length > 0);
    if (items.length > 0) {
      blocks.push({ type: "list", ordered: list.ordered, items });
    }
    list = null;
  };

  for (const line of text.split("\n")) {
    const listMatch = LIST_ITEM.exec(line);
    if (listMatch) {
      flushParagraph();
      const ordered = Boolean(listMatch[1]);
      if (list && list.ordered !== ordered) {
        flushList();
      }
      if (!list) {
        list = { ordered, items: [] };
      }
      list.items.push(listMatch[2]);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

function parseInlines(text: string): MessageInline[] {
  const spans: MessageInline[] = [];
  const pattern = inlinePattern();
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      pushText(spans, text.slice(cursor, index));
    }
    const groups = match.groups ?? {};
    if (groups.colonHref) {
      spans.push(linkSpan(groups.colonHref, groups.colonLabel ?? groups.colonHref));
    } else if (groups.bracketHref) {
      spans.push(linkSpan(groups.bracketHref, groups.bracketLabel ?? groups.bracketHref));
    } else if (groups.wrappedHref) {
      spans.push(linkSpan(groups.wrappedHref, groups.wrappedHref));
    } else if (groups.bareHref) {
      spans.push(linkSpan(groups.bareHref, groups.bareHref));
    }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) {
    pushText(spans, text.slice(cursor));
  }
  return spans.filter((span) => span.type === "link" || span.value.length > 0);
}

function inlinePattern() {
  return new RegExp(
    [
      String.raw`(?<colonLabel>[^\s\n]{1,80}):[ \t]+(?<colonHref>https?://[^\s<>\]]+)(?:[ \t]*\n?[ \t]*\[\k<colonHref>\])?`,
      String.raw`(?<bracketLabel>\S+)[ \t]+\[(?<bracketHref>https?://[^\s\]]+)\]`,
      String.raw`\[(?<wrappedHref>https?://[^\s\]]+)\]`,
      String.raw`(?<bareHref>https?://[^\s<>\]]+)`,
    ].join("|"),
    "gi",
  );
}

function pushText(spans: MessageInline[], value: string) {
  if (value) {
    spans.push({ type: "text", value });
  }
}

function linkSpan(href: string, label: string): MessageInline {
  const cleaned = cleanHref(href);
  const absolute = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  return {
    type: "link",
    href: absolute,
    label: displayLinkLabel(label, absolute),
  };
}

function displayLinkLabel(label: string, href: string) {
  const trimmed = label.trim();
  if (!trimmed || urlsLookSame(trimmed, href)) {
    return compactUrlLabel(href);
  }
  return trimmed;
}

function compactUrlLabel(href: string) {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./i, "");
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${host}${path}`;
  } catch {
    return href;
  }
}

function cleanHref(href: string) {
  return decodeEntities(href).replace(/[),.;!?]+$/g, "");
}

function normalizeHref(href: string) {
  return cleanHref(href).replace(/\/+$/, "").toLowerCase();
}

function urlsLookSame(left: string, right: string) {
  return normalizeHref(left) === normalizeHref(right);
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}
