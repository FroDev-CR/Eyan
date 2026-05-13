"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, stringToColor, formatDate } from "@/lib/utils";
import { driverStatusLabels, driverStatusVariants } from "@/constants/status";
import type { Driver } from "@/types";
import { MoreVertical, Pencil, Trash2, Phone, Mail, CreditCard } from "lucide-react";

interface DriverCardProps {
  driver: Driver;
  onDelete?: (driver: Driver) => void;
}

export function DriverCard({ driver, onDelete }: DriverCardProps) {
  const fullName = `${driver.firstName} ${driver.lastName}`;
  const initials = getInitials(fullName);
  const avatarColor = stringToColor(fullName);

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback style={{ backgroundColor: avatarColor }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link
                href={`/drivers/${driver._id}`}
                className="font-semibold hover:text-primary transition-colors"
              >
                {fullName}
              </Link>
              <Badge
                variant={driverStatusVariants[driver.status]}
                className="ml-2"
              >
                {driverStatusLabels[driver.status]}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/drivers/${driver._id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(driver)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>{driver.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>{driver.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="font-mono">{driver.licenseNumber}</span>
            <span className="text-xs">
              (Vence: {formatDate(driver.licenseExpiry)})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
