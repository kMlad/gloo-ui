import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { apiFetch } from "@/lib/api";
import { listLeadLocations, listLeads } from "@/lib/leads";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), apiFetchBlob: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiFetch).mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
});

describe("lead location requests", () => {
  it("sends each selected location as a repeated query param", async () => {
    await listLeads({
      locations: ["United States", "Canada"],
    });

    expect(apiFetch).toHaveBeenCalledWith("/leads?locations=United+States&locations=Canada", {
      signal: undefined,
    });
  });

  it("searches distinct locations with a substring query", async () => {
    await listLeadLocations({ q: "United States", limit: 100 });

    expect(apiFetch).toHaveBeenCalledWith("/leads/locations?q=United+States&limit=100", {
      signal: undefined,
    });
  });
});
