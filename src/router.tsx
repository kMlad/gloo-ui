import { createBrowserRouter, Navigate } from "react-router";
import { PublicLayout } from "./ui/layouts/public-layout";
import { ProtectedLayout } from "./ui/layouts/protected-layout";
import { PasswordRequiredLayout } from "./ui/layouts/password-required-layout";
import { AppLayout } from "./ui/layouts/app-layout";
import { InviteLayout } from "./ui/layouts/invite-layout";
import { DashboardPage } from "./ui/pages/dashboard-page";
import { LoginPage } from "./ui/pages/login-page";
import { ForgotPasswordPage } from "./ui/pages/forgot-password-page";
import { UpdatePasswordPage } from "./ui/pages/update-password-page";
import { InviteUserPage } from "./ui/pages/invite-user-page";
import { TablesPage } from "./ui/pages/tables-page";
import { TableDetailPage } from "./ui/pages/table-detail-page";
import { LeadsPage } from "./ui/pages/leads-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    Component: PublicLayout,
    children: [
      {
        path: "/login",
        Component: LoginPage,
      },
      {
        path: "/register",
        element: <Navigate to="/login" replace />,
      },
      {
        path: "/forgot-password",
        Component: ForgotPasswordPage,
      },
    ],
  },
  {
    Component: ProtectedLayout,
    children: [
      {
        path: "/update-password",
        Component: UpdatePasswordPage,
      },
      {
        Component: PasswordRequiredLayout,
        children: [
          {
            Component: AppLayout,
            children: [
              {
                path: "/dashboard",
                Component: DashboardPage,
              },
              {
                path: "/tables",
                Component: TablesPage,
              },
              {
                path: "/tables/:tableId",
                Component: TableDetailPage,
              },
              {
                path: "/leads",
                Component: LeadsPage,
              },
              {
                Component: InviteLayout,
                children: [
                  {
                    path: "/invite-user",
                    Component: InviteUserPage,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
