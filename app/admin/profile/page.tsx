"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getToken } from "../../../lib/auth-token";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import { CircleUser, KeyRound, BadgeCheck } from "lucide-react";
import { Skeleton } from "../../../components/Skeleton";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
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
  const updateMe = useMutation((api as any)?.auth?.updateMe);
  const [name, setName] = useState("");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if ((me as any)?.displayName) setName((me as any).displayName);
  }, [me]);

  if (!ready || !token) return <main className="p-8 text-base">Loading...</main>;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await (updateMe as any)({ token, displayName: name });
      setMsg("Display name updated.");
    } catch (err: any) {
      setMsg(err?.message ?? "Failed");
    }
  }

  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await (updateMe as any)({ token, currentPassword: cur, newPassword: next });
      setMsg("Password changed.");
      setCur(""); setNext("");
    } catch (err: any) {
      setMsg(err?.message ?? "Failed");
    }
  }

  return (
    <div className="min-h-screen font-body text-base text-slate-800 dark:text-rose-50">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center gap-2">
          <a href="/admin" className="glass inline-flex min-h-[44px] items-center rounded-full px-4 py-2">← Dashboard</a>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold"><CircleUser size={20} aria-hidden /> My profile</h1>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-5 space-y-4">
        <section aria-label="Account details" className="glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-bold"><BadgeCheck size={18} aria-hidden /> Account details</h2>
          {(me as any) === undefined ? (
            <div className="mt-2 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-64" /></div>
          ) : (
            <dl className="mt-2 space-y-1">
              <div className="flex gap-2"><dt className="w-28 opacity-60">Username</dt><dd className="font-mono font-semibold">{(me as any)?.username}</dd></div>
              <div className="flex gap-2"><dt className="w-28 opacity-60">Name</dt><dd className="font-semibold">{(me as any)?.displayName}</dd></div>
              <div className="flex gap-2"><dt className="w-28 opacity-60">Role</dt><dd>{(me as any)?.role}</dd></div>
              <div className="flex gap-2"><dt className="w-28 opacity-60">Branch</dt><dd className="font-mono">{(me as any)?.branch}</dd></div>
            </dl>
          )}
        </section>
        <section aria-label="Change display name" className="glass rounded-3xl p-5">
          <h2 className="font-bold">Display name</h2>
          <form onSubmit={saveName} className="mt-2 flex flex-col sm:flex-row gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" className="min-h-[48px] flex-1 rounded-xl border px-3 py-2" />
            <button type="submit" className="min-h-[48px] rounded-xl bg-slate-900 dark:bg-amber-200 dark:text-red-950 px-5 py-2 font-bold text-white">Save name</button>
          </form>
        </section>
        <section aria-label="Change password" className="glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-bold"><KeyRound size={18} aria-hidden /> Change password</h2>
          <form onSubmit={savePw} className="mt-2 space-y-2">
            <label className="block text-sm font-semibold">Current password
              <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} aria-label="Current password" className="mt-1 min-h-[48px] w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="block text-sm font-semibold">New password (min 4 characters)
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} aria-label="New password" className="mt-1 min-h-[48px] w-full rounded-xl border px-3 py-2" />
            </label>
            <button type="submit" className="min-h-[48px] rounded-xl border px-5 py-2 font-bold">Change password</button>
          </form>
        </section>
        {msg && <p className="text-sm font-semibold" role="status">{msg}</p>}
      </main>
    </div>
  );
}
