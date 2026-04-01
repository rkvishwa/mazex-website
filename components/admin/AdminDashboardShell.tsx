"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  ClipboardList,
  Handshake,
  LayoutTemplate,
  LogOut,
  Mail,
  Menu,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logoutAdminAction } from "@/app/admin/actions";
import { ThemeToggle } from "./ThemeToggle";

type AdminDashboardShellProps = {
  children?: React.ReactNode;
};

const navigationItems = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/resources", label: "Resources", icon: BookOpenText },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/contacts", label: "Contacts", icon: Mail },
  { href: "/admin/sponsors", label: "Sponsors", icon: Handshake },
  { href: "/admin/form-builder", label: "Form Builder", icon: LayoutTemplate },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function AdminDashboardShell({
  children,
}: AdminDashboardShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 font-sans selection:bg-purple-600/30 selection:text-zinc-950 dark:selection:bg-purple-500/30 dark:selection:text-white"
      suppressHydrationWarning
    >
      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden bg-zinc-950/50 backdrop-blur-sm transition-opacity",
          mobileSidebarOpen ? "opacity-100 block" : "opacity-0 hidden"
        )}
      >
        <button
          className="absolute inset-0 w-full h-full cursor-default"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 lg:static lg:h-screen lg:shrink-0 lg:translate-x-0",
          mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          sidebarCollapsed ? "lg:w-20" : "w-72 lg:w-64"
        )}
      >
        <div className={cn("flex items-center h-16 border-b border-zinc-200 dark:border-zinc-800", sidebarCollapsed ? "justify-between px-6 lg:justify-center lg:px-0" : "justify-between px-6")}>
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity",
              sidebarCollapsed ? "lg:hidden" : "flex"
            )}
          >
            <img src="/images/brand/logo.svg" alt="MazeX Logo" className="h-10 w-auto dark:hidden" />
            <img src="/images/brand/logo-white.svg" alt="MazeX Logo" className="hidden h-10 w-auto dark:block" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn("hidden lg:inline-flex p-1 text-zinc-500 hover:bg-purple-100 hover:text-purple-600 dark:text-zinc-400 dark:hover:bg-purple-500/10 dark:hover:text-purple-200 rounded-md transition-colors", sidebarCollapsed ? "" : "-mr-2")}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 -mr-2 text-zinc-500 hover:bg-purple-100 hover:text-purple-600 dark:text-zinc-400 dark:hover:bg-purple-500/10 dark:hover:text-purple-200 rounded-md"
              aria-label="Close mobile sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p
            className={cn(
              "px-2 mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500",
              sidebarCollapsed && "lg:text-center lg:px-0"
            )}
          >
            {sidebarCollapsed ? "—" : "Menu"}
          </p>

          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-purple-600 dark:focus-visible:ring-purple-900",
                    isActive
                      ? "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-200 font-semibold shadow-sm"
                      : "text-zinc-600 hover:bg-purple-100/50 hover:text-purple-600 dark:text-zinc-400 dark:hover:bg-purple-500/5 dark:hover:text-purple-200",
                    sidebarCollapsed && "lg:justify-center lg:px-0"
                  )}
                  onClick={() => setMobileSidebarOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className={cn(sidebarCollapsed && "lg:hidden")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className={cn("flex items-center mb-4 px-2", sidebarCollapsed ? "justify-center" : "justify-between")}>
             <ThemeToggle />
          </div>
          
          <form action={logoutAdminAction}>
            <button
              type="submit"
              className={cn(
                "flex w-full items-center gap-2 rounded-md bg-purple-100/50 dark:bg-purple-500/10 px-3 py-2.5 text-sm font-medium text-purple-600 dark:text-purple-300 transition-colors hover:bg-purple-100 dark:hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:focus-visible:ring-purple-900",
                sidebarCollapsed ? "justify-center" : "justify-center"
              )}
              title={sidebarCollapsed ? "Sign out" : undefined}
            >
              <LogOut className="h-4.5 w-4.5 shrink-0" />
              <span className={cn(sidebarCollapsed && "lg:hidden")}>
                Sign out
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col h-screen relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        
        {/* Dedicated Portal for Modals/Drawers - perfectly overlays the content width without scrolling */}
        <div id="admin-drawer-portal" className="absolute inset-0 z-50 pointer-events-none" />

        {/* Scrollable Document */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col relative">
          {/* Mobile Header */}
          <header className="sticky top-0 z-30 flex shrink-0 h-16 items-center border-b border-zinc-200 dark:border-zinc-800 bg-white px-4 dark:bg-zinc-950 lg:hidden">
            <button
              type="button"
              className="p-2 -ml-2 text-zinc-600 hover:bg-purple-100 hover:text-purple-600 dark:text-zinc-400 dark:hover:bg-purple-500/10 dark:hover:text-purple-200 rounded-md"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="ml-4 flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
              <img src="/images/brand/logo.svg" alt="MazeX Logo" className="h-10 w-auto dark:hidden" />
              <img src="/images/brand/logo-white.svg" alt="MazeX Logo" className="hidden h-10 w-auto dark:block" />
            </Link>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
