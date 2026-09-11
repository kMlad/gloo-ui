import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { canInvite } from "@/lib/roles";
import { listSdrs, SDR_TIMEZONE, sdrKeys, type SdrListItem } from "@/lib/sdrs";
import { mutationErrorMessage } from "@/lib/tables";
import { useAuth } from "@/providers/auth-context";
import { SdrSettingsDrawer } from "@/ui/components/sdrs/sdr-settings-drawer";
import { SdrsList } from "@/ui/components/sdrs/sdrs-list";
import { Skeleton } from "@/ui/components/ui/skeleton";

export function SdrsPage() {
  const { role } = useAuth();
  const [selectedSdrId, setSelectedSdrId] = useState<string | null>(null);

  const sdrsQuery = useQuery({
    queryKey: sdrKeys.all,
    queryFn: ({ signal }) => listSdrs(signal),
  });

  const sdrs = sdrsQuery.data ?? [];
  const selectedSdr = sdrs.find((sdr) => sdr.id === selectedSdrId) ?? null;
  const error = mutationErrorMessage(
    sdrsQuery.error,
    sdrsQuery.isError ? "Failed to load SDRs" : "",
  );

  function handleSelectSdr(sdr: SdrListItem) {
    setSelectedSdrId(sdr.id);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">SDRs</h1>
        <p className="text-sm text-muted-foreground">
          Set each SDR&apos;s Slack channel and working hours in {SDR_TIMEZONE}. Enrichment stays
          off outside that window; alerts still post.
        </p>
      </div>

      {sdrsQuery.isPending ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : sdrs.length === 0 ? (
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
          <p className="text-sm font-medium text-foreground">No SDRs yet</p>
          <p className="text-sm text-muted-foreground">
            {canInvite(role) ? (
              <>
                Invite an SDR first, then come back to set their channel and hours.{" "}
                <Link
                  to="/invite-user"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Invite a user
                </Link>
              </>
            ) : (
              "Invite an SDR first, then come back to set their channel and hours."
            )}
          </p>
        </div>
      ) : (
        <SdrsList sdrs={sdrs} selectedSdrId={selectedSdrId} onSelectSdr={handleSelectSdr} />
      )}

      <SdrSettingsDrawer
        open={selectedSdrId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSdrId(null);
          }
        }}
        sdr={selectedSdr}
      />
    </div>
  );
}
