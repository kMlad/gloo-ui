import { createBrowserRouter, Navigate } from "react-router";
import { PublicLayout } from "./ui/layouts/public-layout";
import { ProtectedLayout } from "./ui/layouts/protected-layout";
import { AppLayout } from "./ui/layouts/app-layout";
import { AdminLayout } from "./ui/layouts/admin-layout";
import { DashboardPage } from "./ui/pages/dashboard-page";
import { LoginPage } from "./ui/pages/login-page";
import { ForgotPasswordPage } from "./ui/pages/forgot-password-page";
import { UpdatePasswordPage } from "./ui/pages/update-password-page";
import { InviteUserPage } from "./ui/pages/invite-user-page";

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
        Component: AppLayout,
        children: [
          {
            path: "/dashboard",
            Component: DashboardPage,
          },
          {
            Component: AdminLayout,
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
]);
