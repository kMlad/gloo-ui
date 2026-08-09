import { createBrowserRouter } from "react-router";
import { ProtectedLayout } from "./layouts/protected-layout";
import { DashboardPage } from "./pages/dashboard-page";
import { HomePage } from "./pages/home-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    Component: ProtectedLayout,
    children: [
      {
        path: "/dashboard",
        Component: DashboardPage,
      },
    ],
  },
]);
