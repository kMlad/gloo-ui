import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/ui/components/ui/button";
import { useAuth } from "@/providers/auth-context";

export function DashboardPage() {
  const { claims, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-foreground">
      <p className="text-sm text-muted-foreground">Signed in as {claims?.email ?? claims?.sub}</p>
      <Button type="button" variant="outline" disabled={isSigningOut} onClick={handleSignOut}>
        {isSigningOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
