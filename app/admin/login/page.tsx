"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { setToken } from "../../../lib/auth-token";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();
  const login = useMutation((api as any)?.auth?.login);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const res = await (login as any)({ username, password });
      setToken(res.token);
      router.push("/admin");
    } catch {
      setErr("Invalid login");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-strong w-full max-w-sm rounded-3xl p-8">
        <img src="/rf-logo.jpg" alt="RF" className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow" />
        <h1 className="mt-3 text-xl font-black text-slate-900">RF Staff Login</h1>
        <p className="text-xs text-slate-500">Username + password only • biller / inventory / admin</p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2.5">
          <input className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-300" placeholder="username e.g. patricia.stamesa" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-300" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button className="rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white" type="submit">Login →</button>
          <a href="/" className="text-center text-xs text-slate-500 underline">← Back to shop</a>
        </form>
      </div>
    </main>
  );
}
