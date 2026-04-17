import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { DemoBanner } from "./DemoBanner";
import { BhojanBot } from "@/components/bhojanbot/BhojanBot";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout() {
  const { demoMode } = useAuth();
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {demoMode && <DemoBanner />}
        <main className="flex-1 overflow-auto">
          <div className="container max-w-7xl py-6 px-4 md:px-8">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
      {/* BhojanBot — floating AI assistant, visible across all staff pages */}
      <BhojanBot />
    </div>
  );
}
