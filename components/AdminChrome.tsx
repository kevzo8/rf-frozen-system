"use client";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import {
  LayoutDashboard, ClipboardList, Tag, ChartBar, FolderOpen, CircleUser, Users, ShoppingBag,
} from "lucide-react";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/orders", icon: ClipboardList, label: "Orders board" },
  { href: "/admin/prices", icon: Tag, label: "Prices" },
  { href: "/admin/reports", icon: ChartBar, label: "Reports" },
  { href: "/admin/storage", icon: FolderOpen, label: "Storage" },
  { href: "/admin/profile", icon: CircleUser, label: "My profile" },
  { href: "/admin/users", icon: Users, label: "Staff" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Login screen stays chromeless.
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="lg:flex lg:items-start">
      {/* Mobile top nav */}
      <nav aria-label="Admin sections" className="glass sticky top-0 z-30 border-b lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
          <a href="/admin" aria-label="Dashboard" className="shrink-0">
            <img src="/rf-logo.jpg" alt="RF" className="h-9 w-9 rounded-full object-cover ring-2 ring-white" />
          </a>
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              aria-current={isActive(pathname, n.href, n.exact) ? "page" : undefined}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                isActive(pathname, n.href, n.exact)
                  ? "bg-slate-900 text-white dark:bg-amber-200 dark:text-red-950"
                  : "glass"
              }`}
            >
              <n.icon size={16} aria-hidden /> {n.label}
            </a>
          ))}
          <span className="ml-auto flex shrink-0 items-center gap-2 pl-1">
            <a href="/" className="glass inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold">
              <ShoppingBag size={16} aria-hidden /> Shop
            </a>
            <ThemeToggle />
          </span>
        </div>
      </nav>

      {/* Desktop sticky sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/60 p-4 dark:border-white/10 lg:flex">
        <a href="/admin" className="flex items-center gap-2.5 rounded-2xl p-1 transition hover:scale-[1.01]">
          <img src="/rf-logo.jpg" alt="RF" className="h-11 w-11 rounded-full object-cover ring-2 ring-white" />
          <span>
            <span className="block font-display text-base font-bold leading-tight">RF Admin</span>
            <span className="block text-xs opacity-60">Frozen Meat Corp</span>
          </span>
        </a>
        <nav aria-label="Admin sections" className="mt-4 flex flex-col gap-1.5">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              aria-current={isActive(pathname, n.href, n.exact) ? "page" : undefined}
              className={`inline-flex min-h-[48px] items-center gap-2.5 rounded-2xl px-4 py-2 text-[15px] font-bold transition hover:scale-[1.01] ${
                isActive(pathname, n.href, n.exact)
                  ? "bg-slate-900 text-white shadow-lg dark:bg-amber-200 dark:text-red-950"
                  : "hover:bg-slate-900/5 dark:hover:bg-white/5"
              }`}
            >
              <n.icon size={19} aria-hidden /> {n.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
