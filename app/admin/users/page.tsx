"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getToken, clearToken } from "../../../lib/auth-token";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import { Users, UserPlus, ShieldCheck, Store } from "lucide-react";
import { SkeletonLines } from "../../../components/Skeleton";

export const dynamic = "force-dynamic";
const BRANCHES = ["all", "stamesa", "pasig", "blumentritt", "novaliches", "laspinas"];

export default function UsersPage() {
  const router = useRouter();
  const [token, setTok] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = getToken();
    setTok(t);
    setReady(true);
    if (!t) router.push("/admin/login");
  }, [router]);
  const me = useQuery((api as any)?.auth?.me, token ? { token } : "skip");
  const users = useQuery((api as any)?.auth?.listUsers, token && (me as any)?.role === "admin" ? { token } : "skip");
  const createUser = useMutation((api as any)?.auth?.createUser);
  const setActive = useMutation((api as any)?.auth?.setActive);
  const resetPw = useMutation((api as any)?.auth?.resetPassword);
  const setName = useMutation((api as any)?.auth?.setDisplayName);
  const setPerms = useMutation((api as any)?.auth?.setPermissions);
  const [f, setF] = useState({ username: "", password: "", role: "biller", branch: "stamesa", displayName: "" });
  const [msg, setMsg] = useState("");
  const [permMsg, setPermMsg] = useState("");
  const [permBusy, setPermBusy] = useState<string | null>(null);

  async function savePerms(u: any, role: string, branch: string) {
    if (!token) return;
    setPermBusy(u.username);
    setPermMsg("");
    try {
      await (setPerms as any)({ token, username: u.username, role, branch });
      setPermMsg(`Updated ${u.username}: ${role} • ${branch}`);
    } catch (err: any) {
      setPermMsg(err?.message ?? "Failed to update permissions");
    } finally {
      setPermBusy(null);
    }
  }

  if (!ready) return <main className="p-8 text-base">Loading...</main>;
  if (!token) return null;
  if (me && (me as any).role !== "admin") return <main className="p-8 text-base">Admin only. <a href="/admin" className="underline">Back to dashboard</a></main>;

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await (createUser as any)({ token, ...f });
      setMsg(`Created ${f.username}`);
      setF({ username: "", password: "", role: "biller", branch: "stamesa", displayName: "" });
    } catch (err: any) {
      setMsg(err?.message ?? "Failed");
    }
  }

  return (
    <div className="min-h-screen font-body text-base text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-2">
          <a href="/admin" className="glass rounded-full px-4 py-2 min-h-[44px] inline-flex items-center">← Dashboard</a>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold"><Users size={20} aria-hidden /> Staff accounts</h1>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="glass rounded-3xl p-5 h-fit">
          <h2 className="flex items-center gap-2 font-bold"><UserPlus size={18} aria-hidden /> Create account</h2>
          <form onSubmit={doCreate} className="mt-3 space-y-2.5">
            <input aria-label="Username" className="min-h-[48px] w-full rounded-xl border px-3 py-2" placeholder="username e.g. patricia.stamesa" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
            <input aria-label="Display name" className="min-h-[48px] w-full rounded-xl border px-3 py-2" placeholder="Display name e.g. Patricia" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
            <input aria-label="Password" type="password" className="min-h-[48px] w-full rounded-xl border px-3 py-2" placeholder="password (min 4 chars)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className="min-h-[48px] rounded-xl border px-2 py-2">
                <option value="admin">admin</option><option value="biller">biller</option><option value="inventory">inventory</option>
              </select>
              <select aria-label="Branch" value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })} className="min-h-[48px] rounded-xl border px-2 py-2">
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <button type="submit" className="min-h-[48px] w-full rounded-xl bg-slate-900 dark:bg-amber-200 dark:text-red-950 py-2.5 font-bold text-white">Create account</button>
            {msg && <p className="text-sm">{msg}</p>}
          </form>
          <p className="mt-2 flex gap-1.5 text-sm opacity-70"><ShieldCheck size={16} aria-hidden /> Admins see all branches. Billers/inventory are scoped to their branch.</p>
        </section>
        <section className="glass rounded-3xl p-5" aria-live="polite">
          <h2 className="flex items-center gap-2 font-bold"><Store size={18} aria-hidden /> All staff ({(users ?? []).length})</h2>
          {permMsg && <p className="mt-1 text-sm font-semibold" role="status">{permMsg}</p>}
          {users === undefined ? (
            <div className="mt-2"><SkeletonLines rows={4} /></div>
          ) : (
          <ul className="mt-2 space-y-2">
            {(users ?? []).map((u: any) => (
              <li key={u.username} className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/20 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{u.displayName} <span className="font-mono text-sm opacity-60">{u.username}</span></p>
                    <p className="text-sm opacity-70">{u.role} • {u.branch} • {u.active ? "active" : "disabled"}{u.username === (me as any)?.username ? " • you" : ""}</p>
                  </div>
                  <button onClick={async () => { const np = prompt(`New password for ${u.username}`); if (np) { await (resetPw as any)({ token, username: u.username, newPassword: np }); alert("Reset done"); } }} className="min-h-[44px] rounded-xl border px-3 text-sm font-semibold">Reset PW</button>
                  <button onClick={async () => { const nn = prompt(`Display name for ${u.username}`, u.displayName); if (nn) { await (setName as any)({ token, username: u.username, displayName: nn }); } }} className="min-h-[44px] rounded-xl border px-3 text-sm font-semibold">Edit name</button>
                  <button onClick={async () => { await (setActive as any)({ token, username: u.username, active: !u.active }); }} className="min-h-[44px] rounded-xl border px-3 text-sm font-semibold">{u.active ? "Disable" : "Enable"}</button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/40 dark:border-white/10 pt-2">
                  <label className="flex min-h-[44px] items-center gap-1.5 text-sm font-semibold">
                    Role
                    <select
                      aria-label={`Role for ${u.username}`}
                      defaultValue={u.role}
                      disabled={permBusy === u.username || u.username === (me as any)?.username}
                      onChange={(e) => savePerms(u, e.target.value, (document.getElementById(`branch-${u.username}`) as HTMLSelectElement)?.value ?? u.branch)}
                      className="min-h-[44px] rounded-xl border px-2 py-1 text-sm disabled:opacity-50"
                    >
                      <option value="admin">admin</option><option value="biller">biller</option><option value="inventory">inventory</option>
                    </select>
                  </label>
                  <label className="flex min-h-[44px] items-center gap-1.5 text-sm font-semibold">
                    Branch
                    <select
                      id={`branch-${u.username}`}
                      aria-label={`Branch for ${u.username}`}
                      defaultValue={u.branch}
                      disabled={permBusy === u.username}
                      onChange={(e) => {
                        const roleEl = document.querySelector(`select[aria-label="Role for ${u.username}"]`) as HTMLSelectElement;
                        savePerms(u, roleEl?.value ?? u.role, e.target.value);
                      }}
                      className="min-h-[44px] rounded-xl border px-2 py-1 text-sm disabled:opacity-50"
                    >
                      {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </label>
                  {u.username === (me as any)?.username
                    ? <span className="text-xs opacity-60">Role locked for your own account</span>
                    : permBusy === u.username && <span className="text-xs opacity-60">Saving…</span>}
                </div>
              </li>
            ))}
          </ul>
          )}
        </section>
      </main>
    </div>
  );
}
