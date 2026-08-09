import { createBrowserRouter, Navigate } from "react-router";
import { PublicLayout } from "./ui/layouts/public-layout";
import { ProtectedLayout } from "./ui/layouts/protected-layout";
import { DashboardPage } from "./ui/pages/dashboard-page";
import { LoginPage } from "./ui/pages/login-page";
import { RegisterPage } from "./ui/pages/register-page";
import { ForgotPasswordPage } from "./ui/pages/forgot-password-page";
import { UpdatePasswordPage } from "./ui/pages/update-password-page";

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
        Component: RegisterPage,
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
        path: "/dashboard",
        Component: DashboardPage,
      },
      {
        path: "/update-password",
        Component: UpdatePasswordPage,
      },
    ],
  },
]);
