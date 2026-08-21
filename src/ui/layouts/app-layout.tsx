import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import { AppSidebar } from "@/ui/components/app-sidebar";
import { Separator } from "@/ui/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/ui/components/ui/sidebar";

const AppHeaderContext = createContext<(content: ReactNode) => void>(() => {});

// Pages inject contextual actions into the app header. `content` must be
// memoized by the caller, otherwise the effect re-fires on every render.
export function useAppHeader(content: ReactNode) {
  const setContent = useContext(AppHeaderContext);
  useEffect(() => {
    setContent(content);
    return () => setContent(null);
  }, [setContent, content]);
}

export function AppLayout() {
  const [headerContent, setHeaderContent] = useState<ReactNode>(null);

  return (
    <AppHeaderContext.Provider value={setHeaderContent}>
      <SidebarProvider className="h-svh overflow-hidden">
        <AppSidebar />
        <SidebarInset className="min-h-0">
          <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/70 px-4 py-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            {headerContent ?? (
              <span className="text-sm font-medium text-muted-foreground">Gloo</span>
            )}
          </header>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AppHeaderContext.Provider>
  );
}
