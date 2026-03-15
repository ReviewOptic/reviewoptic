import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Shield, LogIn, CheckCircle2, XCircle, Trash2, ShieldCheck, ShieldOff, History } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  accountId: string;
  isAdmin: boolean;
  emailVerified: boolean;
  customerCount: number;
  reviewRequestCount: number;
  lastActive: string | null;
}

interface ImpersonationLog {
  id: string;
  adminEmail: string;
  targetEmail: string;
  createdAt: string;
}

export default function Admin() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [log, setLog] = useState<ImpersonationLog[]>([]);
  const [tab, setTab] = useState<"users" | "log">("users");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadUsers = () =>
    fetch("/api/admin/users", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setUsers);

  const loadLog = () =>
    fetch("/api/admin/impersonation-log", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setLog);

  useEffect(() => {
    if (!user?.isAdmin) { navigate("/"); return; }
    Promise.all([loadUsers(), loadLog()]).finally(() => setLoading(false));
  }, [user]);

  const impersonate = async (userId: string) => {
    const r = await fetch(`/api/admin/impersonate/${userId}`, { method: "POST", credentials: "include" });
    if (!r.ok) return;
    queryClient.clear();
    await refreshUser();
    navigate("/");
  };

  const verifyUser = async (userId: string) => {
    const r = await fetch(`/api/admin/verify-user/${userId}`, { method: "POST", credentials: "include" });
    if (r.ok) await loadUsers();
  };

  const toggleAdmin = async (userId: string) => {
    const r = await fetch(`/api/admin/toggle-admin/${userId}`, { method: "POST", credentials: "include" });
    if (r.ok) await loadUsers();
  };

  const deleteUser = async (userId: string) => {
    const r = await fetch(`/api/admin/user/${userId}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { setConfirmDelete(null); await loadUsers(); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Never";
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "users" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Users
        </button>
        <button
          onClick={() => setTab("log")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === "log" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <History className="w-3.5 h-3.5" />
          Impersonation Log
        </button>
      </div>

      {tab === "users" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customers</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Requests sent</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last active</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Verified</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.customerCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.reviewRequestCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(u.lastActive)}</td>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {!u.emailVerified && (
                        <Button size="sm" variant="outline" onClick={() => verifyUser(u.id)} title="Manually verify email">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {u.id !== user?.id && (
                        <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.id)} title={u.isAdmin ? "Remove admin" : "Make admin"}>
                          {u.isAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                      {!u.isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => impersonate(u.id)} title="Impersonate">
                          <LogIn className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {!u.isAdmin && (
                        confirmDelete === u.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}>Confirm</Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(u.id)} title="Delete account">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "log" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {log.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">No impersonation sessions recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Viewed account</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">When</th>
                </tr>
              </thead>
              <tbody>
                {log.map(entry => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{entry.adminEmail}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.targetEmail}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
