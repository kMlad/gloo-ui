import { createContext, useContext } from "react";

export type AuthClaims = {
  sub?: string;
  email?: string;
};

export type AuthContextValue = {
  claims: AuthClaims | null;
  isAuthenticated: boolean;
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
