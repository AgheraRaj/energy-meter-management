"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MeterWithReading } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { meterStatusStyles } from "@/lib/status-styles";

interface ColumnActions {
  onEdit: (meter: MeterWithReading) => void;
  onDelete: (meter: MeterWithReading) => void;
}

// Factory function instead of a static array — actions need onEdit/onDelete callbacks
// from the parent, and columns are otherwise defined outside the component render.
export function getMeterColumns({
  onEdit,
  onDelete,
}: ColumnActions): ColumnDef<MeterWithReading>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => row.original.location || "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={cn("capitalize", meterStatusStyles[row.original.status])}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "powerKw",
      accessorFn: (row) => row.latestReading?.powerKw ?? null,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Power (kW) <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => row.original.latestReading?.powerKw ?? "—",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row.original);
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
