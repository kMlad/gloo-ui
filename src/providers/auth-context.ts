import { createContext, useContext } from "react";
import type { AppRole } from "@/lib/roles";

export type AuthAmrEntry = {
  method: string;
  timestamp?: number;
};

export type AuthClaims = {
  sub?: string;
  email?: string;
  amr?: AuthAmrEntry[];
  app_metadata?: {
    role?: AppRole;
  };
};

export type AuthContextValue = {
  claims: AuthClaims | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  mustSetPassword: boolean;
  isLoading: boolean;
  refreshClaims: () => Promise<void>;
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
