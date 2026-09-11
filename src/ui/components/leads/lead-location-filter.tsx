import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Combobox } from "@base-ui/react/combobox";
import {
  LEAD_LOCATION_PAGE_SIZE,
  MAX_LOCATION_FILTERS,
  leadKeys,
  listLeadLocations,
  type LeadLocationOption,
} from "@/lib/leads";
import { cn } from "@/lib/utils";
import { mutationErrorMessage } from "@/lib/tables";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Tick02Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";

const LOCATION_SEARCH_DEBOUNCE_MS = 250;

type LeadLocationFilterProps = {
  id: string;
  value: string[];
  onChange: (locations: string[]) => void;
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function locationTriggerLabel(selected: LeadLocationOption[]): string {
  if (selected.length === 0) {
    return "All locations";
  }
  if (selected.length === 1) {
    return selected[0].location;
  }
  return `${selected.length} locations`;
}

export function LeadLocationFilter({ id, value, onChange }: LeadLocationFilterProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), LOCATION_SEARCH_DEBOUNCE_MS);
  const countsByLocation = useRef(new Map<string, number>());

  const locationsQuery = useQuery({
    queryKey: leadKeys.locations({ q: debouncedSearch, limit: LEAD_LOCATION_PAGE_SIZE }),
    queryFn: ({ signal }) =>
      listLeadLocations({
        q: debouncedSearch || null,
        limit: LEAD_LOCATION_PAGE_SIZE,
        signal,
      }),
    placeholderData: keepPreviousData,
  });

  if (locationsQuery.data) {
    for (const item of locationsQuery.data.items) {
      countsByLocation.current.set(item.location, item.lead_count);
    }
  }

  const resultItems = locationsQuery.data?.items;
  const items = useMemo(() => {
    const results = resultItems ?? [];
    const seen = new Set(results.map((item) => item.location));
    const extras = value
      .filter((location) => !seen.has(location))
      .map((location) => ({
        location,
        lead_count: countsByLocation.current.get(location) ?? 0,
      }));
    return extras.length > 0 ? [...extras, ...results] : results;
  }, [resultItems, value]);

  const selected = useMemo(
    () =>
      value.map((location) => ({
        location,
        lead_count: countsByLocation.current.get(location) ?? 0,
      })),
    [value],
  );

  const total = locationsQuery.data?.total ?? 0;
  const resultCount = resultItems?.length ?? 0;
  const searching = locationsQuery.isFetching && debouncedSearch.length > 0;
  const error = mutationErrorMessage(
    locationsQuery.error,
    locationsQuery.isError ? "Failed to load locations" : "",
  );
  const atLimit = selected.length >= MAX_LOCATION_FILTERS;
  const truncated = total > resultCount;

  return (
    <Combobox.Root
      multiple
      modal={false}
      filter={null}
      autoHighlight
      items={items}
      value={selected}
      inputValue={search}
      itemToStringLabel={(item) => item.location}
      isItemEqualToValue={(item, selectedItem) => item.location === selectedItem.location}
      onValueChange={(next) => {
        onChange(next.slice(0, MAX_LOCATION_FILTERS).map((item) => item.location));
      }}
      onInputValueChange={(next, details) => {
        if (details.reason !== "input-change" && details.reason !== "input-clear") {
          return;
        }
        setSearch(next);
      }}
      onOpenChange={(open) => {
        if (!open) {
          setSearch("");
        }
      }}
    >
      <Combobox.Trigger
        id={id}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-input/20 px-3 py-1.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground sm:max-w-56 sm:min-w-44 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <Combobox.Value>
          {(current: LeadLocationOption[]) => {
            const selectedValues = current ?? [];
            return (
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-left",
                  selectedValues.length === 0 && "text-muted-foreground",
                )}
              >
                {locationTriggerLabel(selectedValues)}
              </span>
            );
          }}
        </Combobox.Value>
        <Combobox.Icon>
          <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="text-muted-foreground" />
        </Combobox.Icon>
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          className="isolate z-50 outline-none"
          side="bottom"
          sideOffset={4}
          align="start"
        >
          <Combobox.Popup
            className="relative isolate z-50 flex max-h-(--available-height) w-72 origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover/70 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150"
            aria-busy={locationsQuery.isFetching || undefined}
          >
            <div className="border-b border-border/50 p-1">
              <div className="relative">
                <HugeiconsIcon
                  icon={Search01Icon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Combobox.Input
                  placeholder="Search locations"
                  className="h-8 w-full rounded-md border border-input bg-input/20 py-0.5 pr-2 pl-7 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                />
              </div>
            </div>
            {error ? <p className="px-2 py-1.5 text-xs text-destructive">{error}</p> : null}
            <Combobox.Status className="px-2 py-1.5 text-xs text-muted-foreground empty:hidden">
              {searching
                ? "Searching…"
                : truncated
                  ? `Showing ${resultCount} of ${total}. Type to narrow the list.`
                  : null}
            </Combobox.Status>
            <div className="min-h-0 flex-1 overflow-y-auto p-1">
              <Combobox.Empty className="px-2 py-3 text-center text-xs text-muted-foreground">
                {debouncedSearch
                  ? "No matching locations"
                  : locationsQuery.isPending
                    ? "Loading locations…"
                    : "No locations yet"}
              </Combobox.Empty>
              <Combobox.List>
                {(option: LeadLocationOption) => {
                  const selectedOption = value.includes(option.location);
                  return (
                    <Combobox.Item
                      key={option.location}
                      value={option}
                      disabled={!selectedOption && atLimit}
                      className="group relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md py-1 pr-2 pl-2 text-xs/relaxed outline-hidden select-none data-highlighted:bg-foreground/10 data-disabled:pointer-events-none data-disabled:opacity-50"
                    >
                      <span
                        className={cn(
                          "relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                          "group-data-selected:border-primary group-data-selected:bg-primary group-data-selected:text-primary-foreground",
                        )}
                      >
                        <Combobox.ItemIndicator>
                          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5" />
                        </Combobox.ItemIndicator>
                      </span>
                      <span className="min-w-0 flex-1 truncate">{option.location}</span>
                      {option.lead_count > 0 ? (
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {option.lead_count}
                        </span>
                      ) : null}
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
            </div>
            {selected.length > 0 ? (
              <div className="border-t border-border/50 p-1">
                <button
                  type="button"
                  className="flex h-7 w-full items-center rounded-md px-2 text-xs text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground"
                  onClick={() => onChange([])}
                >
                  Clear locations
                </button>
              </div>
            ) : null}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
