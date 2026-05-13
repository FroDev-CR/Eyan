"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { roleLabels } from "@/constants/roles";
import { LogOut, User } from "lucide-react";
import { navigation, driverNavigation } from "@/constants/navigation";
import type { UserRole } from "@/types";

function usePageTitle(pathname: string, role: UserRole): string {
  const allItems = role === "driver"
    ? driverNavigation
    : navigation.flatMap((s) => s.items);
  const match = allItems
    .filter((i) => i.href !== "/dashboard")
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  if (match) return match.title;
  if (pathname === "/dashboard") return "Dashboard";
  return "";
}

export function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const user = session?.user;
  const userRole = (user?.role as UserRole) ?? "driver";

  const pageTitle = usePageTitle(pathname, userRole);
  const initials = user?.name ? getInitials(user.name) : "U";
  const roleLabel = roleLabels[userRole] ?? userRole;

  return (
    <header
      className="h-14 border-b border-border flex items-center justify-between px-5 flex-shrink-0"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Page title */}
      <h1 className="font-heading font-600 text-[15px] tracking-wide text-muted-foreground uppercase">
        {pageTitle}
      </h1>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2.5 h-9 px-2.5 rounded-md hover:bg-accent"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className="text-[11px] font-heading font-600"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="text-[13px] font-medium text-foreground">{user?.name}</span>
              <span className="text-[10px] font-heading font-600 uppercase tracking-widest text-primary">
                {roleLabel}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/perfil")}>
            <User className="mr-2 h-4 w-4" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
