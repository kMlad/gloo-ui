import { useEffect, useState } from "react";
import { isAdminRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { AuthContext, type AuthClaims } from "@/providers/auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function syncClaims() {
      const { data } = await supabase.auth.getClaims();
      if (!cancelled) {
        setClaims((data?.claims as AuthClaims | undefined) ?? null);
        setIsLoading(false);
      }
    }

    // Wait for client init (including detectSessionInUrl) before the first claims check
    void supabase.auth.getSession().then(() => {
      void syncClaims();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Defer so we don't deadlock with supabase-js auth locks
      setTimeout(() => {
        void syncClaims();
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  }

  const role = claims?.app_metadata?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        claims,
        role,
        isAuthenticated: claims !== null,
        isAdmin: isAdminRole(role),
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
