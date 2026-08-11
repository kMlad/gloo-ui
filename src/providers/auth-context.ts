import { createContext, useContext } from "react";
import type { AppRole } from "@/lib/roles";

export type AuthClaims = {
  sub?: string;
  email?: string;
  app_metadata?: {
    role?: AppRole;
  };
};

export type AuthContextValue = {
  claims: AuthClaims | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
