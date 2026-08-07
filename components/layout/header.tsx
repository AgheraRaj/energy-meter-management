import { MobileSidebar } from "./mobile-sidebar";
import { UserMenu } from "./user-menu";


export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <MobileSidebar />
        <h1 className="text-lg font-medium">Dashboard</h1>
      </div>
      <UserMenu />
    </header>
  );
}