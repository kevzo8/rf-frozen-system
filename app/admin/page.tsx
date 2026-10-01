"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getToken, clearToken } from "../../lib/auth-token";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = getToken();
    setTokenState(t);
    setReady(true);
    if (!t) router.push("/admin/login");
  }, [router]);
  const me = useQuery((api as any)?.auth?.me, token ? { token } : "skip");
  const users = useQuery((api as any)?.auth?.listUsers, token && me?.role === "admin" ? { token } : "skip");
  const logout = useMutation((api as any)?.auth?.logout);
  const createUser = useMutation((api as any)?.auth?.createUser);

  const [f, setF] = useState({ username: "", password: "", role: "biller", branch: "stamesa", displayName: "" });

  if (!ready) return <main className="p-8 text-sm">Loading...</main>;
  if (!token) return null;

  async function doLogout() {
    await (logout as any)({ token });
    clearToken();
    router.push("/admin/login");
  }

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    await (createUser as any)({ token, ...f });
    setF({ username: "", password: "", role: "biller", branch: "stamesa", displayName: "" });
  }

  return (
    <main className="mx-auto max-w-3xl p-8 font-body">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-xl font-bold">RF Admin - {me?.displayName} ({me?.role}/{me?.branch})</h1>
        <button onClick={doLogout} className="border px-3 py-1 rounded">Logout</button>
      </div>
      <nav className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm font-semibold">
        <a href="/admin/orders" className="glass rounded-2xl p-3 text-center">🧾 Orders board</a>
        <a href="/admin/prices" className="glass rounded-2xl p-3 text-center">🏷 Prices</a>
        <a href="/admin/reports" className="glass rounded-2xl p-3 text-center">📊 Reports + xlsx</a>
        <a href="/admin/storage" className="glass rounded-2xl p-3 text-center">🗂 Storage export</a>
      </nav>
      {me?.role === "admin" ? (
        <section className="mt-6">
          <h2 className="font-semibold">Create account (admin only)</h2>
          <form onSubmit={doCreate} className="grid grid-cols-2 gap-2 mt-2">
            <input className="border p-2 rounded" placeholder="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
            <input className="border p-2 rounded" placeholder="display name e.g. Patricia" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
            <input className="border p-2 rounded" placeholder="password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <select className="border p-2 rounded" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="admin">admin</option>
              <option value="biller">biller</option>
              <option value="inventory">inventory</option>
            </select>
            <select className="border p-2 rounded col-span-2" value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })}>
              {["all", "stamesa", "qc", "pasig", "blumentritt", "novaliches", "laspinas"].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <button className="bg-red-800 text-white p-2 rounded col-span-2" type="submit">Create</button>
          </form>
          <h3 className="mt-4 font-semibold">Users</h3>
          <ul className="text-sm">
            {users?.map((u: any) => <li key={u.username}>{u.username} - {u.displayName} - {u.role}/{u.branch} - {u.active ? "active" : "disabled"}</li>)}
          </ul>
        </section>
      ) : (
        <p className="mt-6 text-sm">Logged in as {me?.role}. Reports / orders coming next.</p>
      )}
    </main>
  );
}
