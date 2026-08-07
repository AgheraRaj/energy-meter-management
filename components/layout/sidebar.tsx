import { SidebarNav } from "./sidebar-nav";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center px-6">
        <span className="text-lg font-semibold">EMS</span>
      </div>
      <div className="flex-1 py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}