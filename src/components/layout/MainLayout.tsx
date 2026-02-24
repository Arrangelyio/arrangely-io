import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const isNative = Capacitor.isNativePlatform();

  // Don't show sidebar on mobile or native apps
  const shouldShowSidebar = showSidebar && !isMobile && !isNative;

  return (
    <div className="flex min-h-screen w-full">
      {shouldShowSidebar && <AppSidebar />}
      <main className={`flex-1 min-w-0 ${shouldShowSidebar ? 'pt-16' : ''}`}>
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
