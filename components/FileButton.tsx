"use client";
import { useRef, useState } from "react";
import { Upload, FileCheck } from "lucide-react";

export default function FileButton({
  label = "Choose file",
  accept,
  onFile,
}: {
  label?: string;
  accept?: string;
  onFile: (f: File | undefined) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          setName(f?.name ?? "");
          onFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-dashed border-slate-400 dark:border-white/25 bg-white/70 dark:bg-black/30 px-5 py-2.5 text-base font-bold transition hover:scale-[1.02] hover:border-red-500 focus-visible:outline-2"
      >
        <Upload size={18} aria-hidden /> {name ? "Change file" : label}
      </button>
      {name ? (
        <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 px-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          <FileCheck size={16} aria-hidden /> {name}
        </span>
      ) : (
        <span className="text-sm opacity-60">No file chosen</span>
      )}
    </span>
  );
}
