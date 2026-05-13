import {
  LayoutDashboard,
  Calendar,
  Truck,
  MapPin,
  Users,
  ClipboardList,
  Building2,
  CreditCard,
  Settings,
  Thermometer,
  FolderOpen,
  UserCog,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[]; // Roles que pueden ver este item
  badge?: string;
  disabled?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: "Principal",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "dispatcher", "driver"],
      },
      {
        title: "Planificación",
        href: "/planning",
        icon: Calendar,
        roles: ["admin", "dispatcher"],
      },
    ],
  },
  {
    title: "Operaciones",
    items: [
      {
        title: "Coordinadores",
        href: "/drivers",
        icon: Users,
        roles: ["admin"],
      },
      {
        title: "Flota",
        href: "/fleet",
        icon: Truck,
        roles: ["admin"],
      },
      {
        title: "Rutas",
        href: "/routes",
        icon: MapPin,
        roles: ["admin", "dispatcher"],
      },
    ],
  },
  {
    title: "Proveedores",
    items: [
      {
        title: "Dos Pinos",
        href: "/dos-pinos",
        icon: Thermometer,
        roles: ["admin", "dispatcher"],
      },
      {
        title: "Mis Tareas",
        href: "/dos-pinos/mis-casos",
        icon: FolderOpen,
        roles: ["driver"],
      },
      {
        title: "Rutas diarias",
        href: "/dos-pinos/rutas",
        icon: ClipboardList,
        roles: ["admin", "dispatcher"],
      },
    ],
  },
  {
    title: "Contabilidad",
    items: [
      {
        title: "Facturas",
        href: "/contabilidad",
        icon: Receipt,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Próximamente",
    items: [
      {
        title: "Órdenes",
        href: "/orders",
        icon: ClipboardList,
        roles: ["admin", "dispatcher"],
        disabled: true,
      },
      {
        title: "CRM",
        href: "/crm",
        icon: Building2,
        roles: ["admin"],
        disabled: true,
      },
      {
        title: "Planilla",
        href: "/payroll",
        icon: CreditCard,
        roles: ["admin"],
        disabled: true,
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        title: "Usuarios",
        href: "/settings/users",
        icon: UserCog,
        roles: ["admin"],
      },
      {
        title: "Configuración",
        href: "/settings",
        icon: Settings,
        roles: ["admin"],
      },
    ],
  },
];

// Items para la navegación del coordinador (vista simplificada)
export const driverNavigation: NavItem[] = [
  {
    title: "Mis Tareas",
    href: "/dos-pinos/mis-casos",
    icon: FolderOpen,
    roles: ["driver"],
  },
];
