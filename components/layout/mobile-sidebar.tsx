"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Zap } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-60 p-0 flex flex-col bg-sidebar">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <div className="leading-none">
            <p className="font-display text-sm font-bold tracking-widest text-foreground">VOLTIQ</p>
            <p className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
              Energy Command Center
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>

        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
            <p className="text-[10px] text-muted-foreground">Live data · updates in real time</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}