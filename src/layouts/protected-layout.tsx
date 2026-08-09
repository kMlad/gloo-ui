import { Outlet } from "react-router";

export function ProtectedLayout() {
  // TODO: redirect unauthenticated users once auth is implemented
  return <Outlet />;
}
