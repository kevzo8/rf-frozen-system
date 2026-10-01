"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try { localStorage.setItem("rf-theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  }
  return (
    <button onClick={toggle} aria-label={dark ? "Switch to day mode" : "Switch to night mode"}
      className="glass inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-base font-semibold text-slate-700 dark:text-amber-100 transition hover:scale-105 focus-visible:outline-2">
      {dark ? <><Sun size={18} aria-hidden /> Day</> : <><Moon size={18} aria-hidden /> Night</>}
    </button>
  );
}
