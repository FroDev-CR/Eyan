"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  navigation,
  driverNavigation,
  type NavItem,
} from "@/constants/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { UserRole } from "@/types";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user?.role as UserRole) || "driver";

  const filteredNavigation =
    userRole === "driver"
      ? [{ title: "", items: driverNavigation }]
      : navigation
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.roles.includes(userRole)),
          }))
          .filter((section) => section.items.length > 0);

  return (
    <aside
      style={{ backgroundColor: "var(--color-sidebar)" }}
      className={cn(
        "flex flex-col h-screen border-r border-border flex-shrink-0 transition-[width] duration-200",
        collapsed ? "w-[56px]" : "w-[220px]"
      )}
    >
      {/* ── Logotype ─────────────────────────────────────── */}
      <div className="flex items-center h-14 px-3 border-b border-border flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          {/* Mark */}
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4.5 w-4.5"
              style={{ color: "var(--color-primary-foreground)" }}
            >
              <path
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="9"
                y="14"
                width="6"
                height="7"
                rx="0.5"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
          {!collapsed && (
            <span
              className="font-heading font-700 text-[18px] tracking-tight text-foreground leading-none"
              style={{ fontWeight: 700 }}
            >
              EYAN
            </span>
          )}
        </Link>

        {/* Collapse toggle — far right when expanded */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Colapsar sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {filteredNavigation.map((section, idx) => (
          <div key={section.title || idx}>
            {section.title && !collapsed && (
              <p className="px-3 mb-1 text-[10px] font-heading font-600 text-muted-foreground uppercase tracking-widest">
                {section.title}
              </p>
            )}
            {section.title && collapsed && idx > 0 && (
              <div className="mx-3 my-2 border-t border-border" />
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))}
                  collapsed={collapsed}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Expand button when collapsed ─────────────────── */}
      {collapsed && (
        <div className="p-2 border-t border-border">
          <button
            onClick={() => setCollapsed(false)}
            className="h-8 w-8 mx-auto flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Expandir sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}

function SidebarItem({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const inner = (
    <Link
      href={item.disabled ? "#" : item.href}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors group",
        isActive
          ? "bg-primary/[0.14] text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        item.disabled && "pointer-events-none opacity-40"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 flex-shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && (
        <span
          className={cn(
            "flex-1 text-[13px] leading-none font-medium truncate",
            isActive && "text-primary"
          )}
        >
          {item.title}
        </span>
      )}
      {!collapsed && item.disabled && (
        <span className="text-[10px] text-muted-foreground font-heading tracking-wide">
          PRONTO
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.title}
            {item.disabled && " (próximamente)"}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return <li>{inner}</li>;
}
