"use client";
import { useEffect, useState } from "react";

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
    <button onClick={toggle} aria-label="Toggle night mode"
      className="glass rounded-full px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-amber-100 transition hover:scale-105">
      {dark ? "☀️ Day" : "🌙 Night"}
    </button>
  );
}
