import { useState } from "react";
import { SmartleadCampaignsPanel } from "@/ui/components/campaigns/smartlead-campaigns-panel";
import { HeyReachCampaignsPanel } from "@/ui/components/campaigns/heyreach-campaigns-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";

export function CampaignsPage() {
  const [source, setSource] = useState("smartlead");
  const heyreach = source === "heyreach";

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <Tabs
        value={source}
        onValueChange={(value) => {
          if (value === "smartlead" || value === "heyreach") {
            setSource(value);
          }
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              {heyreach
                ? "Import LinkedIn conversations per campaign, then open a campaign to enrich those leads."
                : "Import Positive and OOO replies independently per campaign, then open a campaign to enrich those leads."}
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="smartlead">SmartLead</TabsTrigger>
            <TabsTrigger value="heyreach">HeyReach</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="smartlead">
          <SmartleadCampaignsPanel />
        </TabsContent>
        <TabsContent value="heyreach">
          <HeyReachCampaignsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
