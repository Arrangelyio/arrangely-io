import {
  Home,
  Library,
  BookOpen,
  Users,
  Calendar,
  // User,
  // MessageCircle,
  // Bot,
  // Tag,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getMobileUrl } from "@/utils/mobileUtils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { NavigationBar } from "@hugotomazi/capacitor-navigation-bar";
import { useEffect } from "react";

const BottomNavigation = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    {
      icon: Home,
      label: "nav.home",
      to: getMobileUrl("/"),
      path: "/",
    },
    {
      icon: Library,
      label: "nav.library",
      to: getMobileUrl("/library"),
      path: "/library",
    },
    {
      icon: Users,
      label: "nav.community",
      to: getMobileUrl("/community-library"),
      path: "/community-library",
      isCenter: true,
    },
    {
      icon: BookOpen,
      label: "nav.lessons",
      to: getMobileUrl("/arrangely-music-lab"),
      path: "/arrangely-music-lab",
      isNew: true,
    },
    {
      icon: Calendar,
      label: "nav.events",
      to: getMobileUrl("/events"),
      path: "/events",
    },
  ];

  const isActiveTab = (path: string) => location.pathname === path;

  useEffect(() => {
    const setSystemNavBarColor = async () => {
      if (Capacitor.getPlatform() === "android") {
        try {
          await NavigationBar.setColor({ color: "#000000" }); // Set jadi Hitam
        } catch (error) {
          
        }
      }
    };

    setSystemNavBarColor();
  }, []);

  return (
    <div
      /* PERBAIKAN UTAMA DI SINI:
         pb-[env(safe-area-inset-bottom)] 
         -> Memberi jarak untuk garis Home Indicator iPhone.
      */
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-[100] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-end justify-between h-16 px-6 relative">
        {/* KIRI (Home + Library) */}
        <div className="flex flex-1 justify-evenly">
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = isActiveTab(item.path);

            return (
              <Link
                key={item.path}
                to={item.to}
                className={`flex flex-col items-center transition-all duration-300 flex-1 py-2 px-1 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon
                  className={`h-5 w-5 mb-1 ${isActive ? "text-primary" : ""}`}
                />
                <span
                  className={`text-xs truncate ${
                    isActive ? "text-primary font-medium" : ""
                  }`}
                >
                  {t(item.label)}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="w-14" />
        {/* TENGAH (Community) */}
        {navItems
          .filter((item) => item.isCenter)
          .map((item) => {
            return (
              <Button
                key={item.path}
                size="lg"
                asChild
                className="absolute left-1/2 -translate-x-1/2 -translate-y-6 
                h-16 w-12
                rounded-full bg-gradient-to-br 
                from-primary via-primary-glow to-primary 
                hover:from-primary-glow hover:to-primary shadow-2xl 
                hover:shadow-primary/40 transition-all duration-500 hover:scale-120 
                group overflow-hidden z-10 ring-4 ring-primary/20 hover:ring-primary/40"
              >
                <Link to={item.to}>
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/40 to-transparent animate-pulse"></div>

                  {/* Rotating Border Effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin [animation-duration:3s]"></div>

                  {/* Ripple Effect */}
                  <div className="absolute inset-0 rounded-full bg-white/10 animate-ping [animation-duration:2s]"></div>

                  {/* Icon Container */}
                  <div className="relative z-20 flex items-center justify-center">
                    <Users className="h-8 w-8 text-white animate-scale-in drop-shadow-lg" />
                  </div>
                </Link>
              </Button>
            );
          })}

        {/* KANAN (Pricing + Profile) */}
        <div className="flex flex-1 justify-evenly">
          {navItems.slice(3).map((item) => {
            const Icon = item.icon;
            const isActive = isActiveTab(item.path);

            return (
              <Link
                key={item.path}
                to={item.to}
                className={`relative flex flex-col items-center transition-all duration-300 flex-1 py-2 px-1 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 mb-1 ${isActive ? "text-primary" : ""}`}
                  />

                  {/* BADGE NEW / BARU */}
                  {item.isNew && (
                    <span
                      className="
                        absolute -top-4 -right-1.5
                        bg-red-500 text-[9px] text-white font-bold 
                        px-1 py-[1px] rounded-full shadow-md
                        animate-[pulse_1.6s_ease-in-out_infinite,blink_2.2s_ease-in-out_infinite]
                      "
                    >
                      {t("nav.labelNew")}

                      {/* RING PING EFFECT */}
                      <span
                        className="
                          absolute inset-0 rounded-full
                          animate-ping bg-red-500 opacity-40
                        "
                      />
                    </span>
                  )}
                </div>

                <span
                  className={`text-xs truncate ${
                    isActive ? "text-primary font-medium" : ""
                  }`}
                >
                  {t(item.label)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
