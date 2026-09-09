import { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SelectRoot } from "@base-ui/react/select";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { apiFetch } from "@/lib/api";
import { type LeadStatus } from "@/lib/leads";
import { LeadStatusField } from "@/ui/components/leads/lead-status-field";

const control = vi.hoisted(() => ({
  onValueChange: undefined as SelectRoot.Props<LeadStatus>["onValueChange"],
}));

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), apiFetchBlob: vi.fn() }));
vi.mock("@/ui/components/ui/select", () => {
  const Children = ({ children }: { children?: ReactNode }) => children;
  return {
    Select: (props: SelectRoot.Props<LeadStatus>) => {
      control.onValueChange = props.onValueChange;
      return props.children;
    },
    SelectContent: Children,
    SelectItem: Children,
    SelectTrigger: Children,
    SelectValue: () => null,
  };
});

function renderStatus(leadId = "synthetic-lead-a", status: LeadStatus = "new") {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LeadStatusField leadId={leadId} status={status} />
    </QueryClientProvider>,
  );
  return client;
}

function change(value: LeadStatus | null, reason: SelectRoot.ChangeEventReason, type: string) {
  const cancel = vi.fn();
  const details = {
    reason,
    event: new Event(type),
    cancel,
    allowPropagation: vi.fn(),
    isCanceled: false,
    isPropagationAllowed: false,
    trigger: undefined,
  } as SelectRoot.ChangeEventDetails;
  control.onValueChange?.(value, details);
  return cancel;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiFetch).mockResolvedValue({ status: "attempted" });
});

describe("lead status saves", () => {
  it("does not save when displaying or refreshing a lead", () => {
    renderStatus();
    renderStatus();
    renderStatus("synthetic-lead-b", "do_not_contact");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each(["change", "keydown", "base-ui"])(
    "ignores dropdown autofill/typeahead/internal callbacks (%s)",
    async (type) => {
      renderStatus();
      const cancel = change("attempted", "none", type);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(apiFetch).not.toHaveBeenCalled();
      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it.each(["click", "keydown"])("saves explicit item selection (%s)", async (type) => {
    const client = renderStatus("synthetic-lead-b");
    const invalidate = vi.spyOn(client, "invalidateQueries");
    change("attempted", "item-press", type);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    expect(apiFetch).toHaveBeenCalledWith("/leads/synthetic-lead-b", {
      method: "PATCH",
      body: JSON.stringify({ status: "attempted" }),
    });
    await vi.waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["speed-to-lead"] }),
    );
  });

  it.each([null, "new"] as const)(
    "does not save an empty or unchanged selection (%s)",
    async (value) => {
      renderStatus();
      change(value, "item-press", "click");
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(apiFetch).not.toHaveBeenCalled();
    },
  );
});
