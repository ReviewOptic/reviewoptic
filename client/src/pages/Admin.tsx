import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Shield, LogIn, CheckCircle2, XCircle } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  accountId: string;
  isAdmin: boolean;
  emailVerified: boolean;
}

export default function Admin() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) { navigate("/"); return; }
    fetch("/api/admin/users", { credentials: "include" })
      .then(r => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [user]);

  const impersonate = async (userId: string) => {
    await fetch(`/api/admin/impersonate/${userId}`, { method: "POST", credentials: "include" });
    await refreshUser();
    navigate("/");
  };

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Verified</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{u.email}</td>
                <td className="px-4 py-3">
                  {u.emailVerified
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <XCircle className="w-4 h-4 text-muted-foreground" />}
                </td>
                <td className="px-4 py-3">
                  {u.isAdmin
                    ? <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
                    : <span className="text-xs text-muted-foreground">User</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {!u.isAdmin && u.id !== user?.id && (
                    <Button size="sm" variant="outline" onClick={() => impersonate(u.id)}>
                      <LogIn className="w-3.5 h-3.5 mr-1.5" />
                      Impersonate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
