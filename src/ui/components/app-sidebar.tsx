import { useState, type ComponentProps } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { NavUser } from "@/ui/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/ui/sidebar";
import {
  canAccessSpeedToLead,
  canAssignLeads,
  canInvite,
  canManageSdrs,
  canManageSmartlead,
} from "@/lib/roles";
import {
  listSpeedToLeadEvents,
  SPEED_TO_LEAD_POLL_IDLE_MS,
  speedToLeadKeys,
} from "@/lib/speed-to-lead";
import { useAuth } from "@/providers/auth-context";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlphabetGreekIcon,
  DashboardSquare01Icon,
  FlashIcon,
  GridTableIcon,
  Mail01Icon,
  Clock01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { claims, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const email = claims?.email ?? "";
  const name = email.split("@")[0] || "Account";
  const showSpeedToLead = canAccessSpeedToLead(role);

  const unhandledQuery = useQuery({
    queryKey: speedToLeadKeys.unhandledCount,
    queryFn: ({ signal }) =>
      listSpeedToLeadEvents({ limit: 1, offset: 0, includeHandled: false, signal }),
    enabled: showSpeedToLead,
    refetchInterval: SPEED_TO_LEAD_POLL_IDLE_MS,
  });
  const unhandledCount = unhandledQuery.data?.total ?? 0;

  const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: DashboardSquare01Icon },
    { title: "Tables", url: "/tables", icon: GridTableIcon },
    { title: "Leads", url: "/leads", icon: UserGroupIcon },
    ...(showSpeedToLead
      ? [{ title: "Speed to lead", url: "/speed-to-lead", icon: FlashIcon }]
      : []),
    ...(canAssignLeads(role)
      ? [{ title: "Assign leads", url: "/assign-leads", icon: UserCheck01Icon }]
      : []),
    ...(canManageSdrs(role) ? [{ title: "SDRs", url: "/sdrs", icon: Clock01Icon }] : []),
    ...(canManageSmartlead(role)
      ? [{ title: "Campaigns", url: "/campaigns", icon: Mail01Icon }]
      : []),
    ...(canInvite(role)
      ? [{ title: "Invite user", url: "/invite-user", icon: UserAdd01Icon }]
      : []),
  ];

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      void navigate("/login", { replace: true });
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon icon={AlphabetGreekIcon} strokeWidth={2} className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Gloo</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={location.pathname.startsWith(item.url)}
                    className={
                      item.url === "/speed-to-lead" && unhandledCount > 0 ? "pr-8" : undefined
                    }
                    render={<Link to={item.url} />}
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.url === "/speed-to-lead" && unhandledCount > 0 ? (
                    <SidebarMenuBadge>
                      {unhandledCount > 99 ? "99+" : unhandledCount}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{ name, email }}
          onSignOut={() => void handleSignOut()}
          isSigningOut={isSigningOut}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
