"use client";
import { useEffect } from "react";

export default function ThemeInitScript() {
  useEffect(() => {
    try {
      const t = localStorage.getItem("rf-theme");
      if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.classList.add("dark");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}