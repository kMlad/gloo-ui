import { Outlet } from "react-router";
import { AppSidebar } from "@/ui/components/app-sidebar";
import { Separator } from "@/ui/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/ui/components/ui/sidebar";

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium text-muted-foreground">Gloo</span>
        </header>
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
