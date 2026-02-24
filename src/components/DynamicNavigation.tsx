import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
    Menu,
    Home,
    Music,
    Users,
    Settings,
    Tags,
    Calendar,
    GraduationCap,
    Crown,
    ShieldCheck,
    Download,
    Plus,
    FileMusic,
    Grid3X3,
    X,
} from "lucide-react";
import UserMenu from "./UserMenu";
import AuthModal from "./AuthModal";
import LanguageSwitcher from "./LanguageSwitcher";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import PremiumBadge from "./monetization/PremiumBadge";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { storeIntendedUrl } from "@/utils/redirectUtils";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import { StatusBar, Style } from "@capacitor/status-bar";
import { NavigationBar } from "@hugotomazi/capacitor-navigation-bar";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import GlobalSearchBar from "./search/GlobalSearchBar";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
    { key: "nav.home", path: "/", icon: Home, requireAuth: false },
    { key: "nav.library", path: "/library", icon: Music, requireAuth: true },
    {
        key: "nav.lessons",
        path: "/arrangely-music-lab",
        icon: GraduationCap,
        requireAuth: false,
        isNew: true, // Badge NEW ada di sini
    },
    // {
    //   key: "nav.sequencer",
    //   path: "/sequencer-store",
    //   icon: Music,
    //   requireAuth: false,
    // },
    { key: "nav.events", path: "/events", icon: Calendar, requireAuth: false },
    {
        key: "nav.pricing",
        path: "/pricing",
        icon: Tags,
        requireAuth: false,
    },
    {
        key: "nav.communityLibrary",
        path: "/community-library",
        icon: Users,
        requireAuth: true,
    },
    {
        key: "nav.creatorDashboard",
        path: "/creator-dashboard",
        icon: Settings,
        roles: ["creator" as UserRole],
        requireAuth: true,
        isComingSoon: false,
    },
];

const DynamicNavigation = ({ isMobileView }: { isMobileView: boolean }) => {
    const [planName, setPlanName] = useState<string | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const { user, role, canAccessRoute, loading, creatorType } = useUserRole();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const fullUrl = window.location.origin + location.pathname;
    const { subscriptionStatus, loading: subscriptionLoading } =
        useSubscription();
    const isNative = Capacitor.isNativePlatform();
    const isDesktop = !useIsMobile() && !isNative;
    const [showMobileBanner, setShowMobileBanner] = useState(false);

    useEffect(() => {
        const getUserPlan = async () => {
            if (!user) {
                setIsLoadingPlan(false);
                setPlanName(null);
                return;
            }

            setIsLoadingPlan(true);
            try {
                const { data: subscription, error } = await supabase
                    .from("subscriptions")
                    .select("*, subscription_plans (name)")
                    .eq("user_id", user.id)
                    .in("status", ["active", "trialing"])
                    .single();

                if (error && error.code !== "PGRST116") throw error;

                if (subscription) {
                    if (subscription.status === "trialing") {
                        setPlanName("Free Trial");
                    } else {
                        // @ts-ignore
                        setPlanName(subscription.subscription_plans.name);
                    }
                } else {
                    setPlanName(null);
                }
            } catch (error) {
                console.error("Error fetching user plan:", error);
                setPlanName(null);
            } finally {
                setIsLoadingPlan(false);
            }
        };

        getUserPlan();
    }, [user]);

    useEffect(() => {
        const isMobileBrowser = !isNative && !isDesktop;

        // Ambil data kapan terakhir banner ditampilkan/dimatikan
        const lastDismissed = localStorage.getItem("last-app-banner-timestamp");
        const now = new Date().getTime();
        const oneDayInMs = 24 * 60 * 60 * 1000; // 24 jam

        // Syarat tampil:
        // 1. Browser mobile
        // 2. Belum pernah ada data (null) ATAU selisih waktu sudah lebih dari 24 jam
        const shouldShow =
            !lastDismissed || now - parseInt(lastDismissed) > oneDayInMs;

        if (isMobileBrowser && shouldShow) {
            setShowMobileBanner(true);
        }
    }, [isNative, isDesktop]);

    const dismissBanner = () => {
        setShowMobileBanner(false);
        localStorage.setItem("dismiss-get-app-banner", "true");
    };

    const GetAppFloatingBanner = () => {
        if (!showMobileBanner) return null;

        // Position above bottom nav (60px) + safe area + small gap
        const offset = "calc(70px + env(safe-area-inset-bottom))";

        return (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed left-4 right-4 z-[80] md:hidden"
                style={{ bottom: offset }}
            >
                <div className="bg-primary shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 flex items-center justify-between border border-white/20">
                    {/* ... konten banner tetap sama ... */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
                            <img
                                src="/Final-Logo-Arrangely-Logogram.png"
                                alt="Logo"
                                className="w-6 h-6 object-contain"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-sm font-bold leading-tight">
                                Nikmati di Aplikasi
                            </span>
                            <span className="text-white/80 text-[10px]">
                                Tersedia untuk{" "}
                                {Capacitor.getPlatform() === "ios"
                                    ? "iOS"
                                    : "Android"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full font-bold text-xs h-9 px-4 bg-white text-primary"
                            onClick={handleDownloadRedirect}
                        >
                            Buka
                        </Button>
                        <button
                            onClick={dismissBanner}
                            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };
    // --- CONFIG SYSTEM BARS ---
    useEffect(() => {
        const configureSystemBars = async () => {
            if (isNative) {
                try {
                    // 1. STATUS BAR (ATAS)
                    await StatusBar.setStyle({ style: Style.Light }); // Coba ganti ke Style.Dark (Icon Hitam) jika background putih
                    await StatusBar.setOverlaysWebView({ overlay: false }); // Coba set ke false dulu untuk tes

                    // 2. NAVIGATION BAR (BAWAH)
                    if (Capacitor.getPlatform() === "android") {
                        // Pastikan bar tidak transparan agar warna background-nya muncul
                        await NavigationBar.setTransparency({
                            isTransparent: false,
                        });

                        // Paksa munculkan bar
                        await NavigationBar.show();

                        await NavigationBar.setColor({
                            color: "#e7e7e7ff", // Tes pakai warna PUTIH dulu agar terlihat jelas
                            darkButtons: true, // Jika background putih, tombol harus HITAM (true)
                        });
                    }
                } catch (err) {
                    console.error("Gagal setting system bars:", err);
                }
            }
        };
        configureSystemBars();
    }, [isNative]);

    const handleDownloadRedirect = () => {
        const userAgent =
            navigator.userAgent || navigator.vendor || (window as any).opera;

        // URL ganti dengan link asli app kamuv
        const APP_STORE_URL =
            "https://apps.apple.com/id/app/arrangely/idXXXXXXXXX";
        const PLAY_STORE_URL =
            "https://play.google.com/store/apps/details?id=arrangely.app&hl=id";
        const DEFAULT_URL = "/download-app"; // Fallback ke landing page

        if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
            window.location.href = APP_STORE_URL;
        } else if (/android/i.test(userAgent)) {
            window.location.href = PLAY_STORE_URL;
        } else {
            // Jika dari Desktop, arahkan ke page download atau landing page
            navigate(DEFAULT_URL);
        }
    };

    const getVisibleNavItems = () => {
        return navigationItems.filter((item) => {
            // Hide pricing on iOS Capacitor (Apple App Store compliance)
            if (item.path === "/pricing" && isCapacitorIOS()) return false;
            if (item.requireAuth && !user) return false;
            if (item.roles && item.roles.length > 0) {
                return canAccessRoute(item.roles);
            }
            return true;
        });
    };

    const visibleNavItems = getVisibleNavItems();

    const NavLink = ({ item }: { item: any }) => {
        const Icon = item.icon;
        const label = t(item.key);
        const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
        const linkPath = item.isComingSoon ? "/coming-soon" : item.path;

        return (
            <Link
                to={linkPath}
                state={
                    item.isComingSoon
                        ? {
                              title: `${label} - ${t("common.comingSoon")}`,
                              description: `The ${label.toLowerCase()} feature is currently under development.`,
                          }
                        : undefined
                }
                className={`relative flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-primary hover:bg-muted"
                } ${item.isComingSoon ? "opacity-75" : ""}`}
                onClick={() => setIsOpen(false)}
            >
                <div className="relative flex items-center">
                    <Icon className="h-4 w-4" />
                    {item.isNew && (
                        <span className="absolute -top-4 -left-7 bg-red-500 text-white text-[8px] font-bold px-1.5 py-[2px] rounded-full shadow-md animate-[pulse_1.6s_ease-in-out_infinite,blink_2s_ease-in-out_infinite]">
                            {t("nav.labelNew")}
                            <span className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-40" />
                        </span>
                    )}
                </div>
                <span>{label}</span>
                {item.isComingSoon && (
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        {t("nav.comingSoon")}
                    </span>
                )}
            </Link>
        );
    };

    const UserPlanBadge = () => {
        if (!user) return null;
        if (subscriptionLoading) {
            return (
                <div className="h-5 w-20 bg-muted rounded animate-pulse self-start mt-0.5" />
            );
        }
        const subscription = subscriptionStatus?.subscription;

        if (subscriptionStatus?.isTrialing) {
            return (
                <PremiumBadge variant="trial" className="self-start mt-0.5" />
            );
        }

        if (
            subscriptionStatus?.hasActiveSubscription &&
            subscription &&
            typeof subscription === "object" &&
            "subscription_plans" in subscription &&
            // @ts-ignore
            subscription.subscription_plans?.name
        ) {
            // @ts-ignore
            const planName = subscription.subscription_plans.name;
            if (creatorType === "creator_arrangely") {
                if (planName.includes("Premium")) {
                    return (
                        <PremiumBadge
                            variant="small"
                            className="self-start mt-0.5"
                        />
                    );
                }
                if (planName.includes("Basic")) {
                    return (
                        <PremiumBadge
                            variant="basic"
                            className="self-start mt-0.5"
                        />
                    );
                }
            }

            if (creatorType === "creator_professional") {
                return (
                    <PremiumBadge
                        variant="pro"
                        className="self-start mt-0.5"
                    />
                );
            }

            if (creatorType === "creator_pro") {
                return (
                    <PremiumBadge
                        variant="community"
                        className="self-start mt-0.5"
                    />
                );
            }
            
        }
        return null;
    };

    // Render creator badge based on creator type
    const renderCreatorBadge = () => {
        if (!user || subscriptionLoading) return null;

        // // Arrangely internal creators
        // if (creatorType === "creator_arrangely") {
        //     return (
        //         <Badge className="ml-1.5 px-1.5 py-0 text-[10px] font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600">
        //             <Crown className="h-2.5 w-2.5 mr-0.5" />
        //             Arrangely
        //         </Badge>
        //     );
        // }

        // // Verified professional creators
        // if (creatorType === "creator_professional") {
        //     return (
        //         <Badge className="ml-1.5 px-1.5 py-0 text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600">
        //             <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
        //             Verified
        //         </Badge>
        //     );
        // }

        // // Community creators (Creator Community subscribers)
        // if (creatorType === "creator_pro") {
        //     return (
        //         <Badge className="ml-1.5 px-1.5 py-0 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30">
        //             Community
        //         </Badge>
        //     );
        // }

        return null;
    };

    // --- COMPONENT BOTTOM NAV KHUSUS MOBILE (DIPERBAIKI) ---
    // --- COMPONENT BOTTOM NAV KHUSUS MOBILE (FIX BADGE LAYER) ---
    const MobileBottomNav = () => {
        const mainMobileItems = [
            navigationItems[0], // Home
            navigationItems[1], // Library
            navigationItems[2], // Music Lab (Ada Badge New)
            navigationItems[3], // Events
        ];

        return (
            <div
                className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-[60] flex justify-around items-center px-2 pb-[env(safe-area-inset-bottom)] pt-2 h-[calc(60px+env(safe-area-inset-bottom))]"
                style={{ boxShadow: "0 -4px 10px rgba(0, 0, 0, 0.3)" }}
            >
                {mainMobileItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const label = t(item.key);

                    return (
                        <Link
                            key={item.key}
                            to={item.path}
                            // PENTING: Tambahkan 'overflow-visible' agar badge tidak terpotong oleh container
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative overflow-visible ${
                                isActive
                                    ? "text-white"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {/* Container Icon: z-0 agar berada di bawah badge */}
                            <div className="relative p-1 z-0">
                                <Icon
                                    className={`h-6 w-6 ${
                                        isActive ? "fill-current" : ""
                                    }`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />

                                {/* Badge: z-50 agar PASTI di atas icon dan elemen lain */}
                                {item.isNew && (
                                    <span className="absolute -top-1.5 -right-3 z-50 flex h-4 items-center justify-center rounded-full bg-red-500 px-1.5 text-[8px] font-bold text-white shadow-sm ring-2 ring-white animate-[pulse_2s_ease-in-out_infinite]">
                                        NEW
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium truncate max-w-[64px]">
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <nav
                style={{
                    paddingTop: isNative
                        ? "calc(env(safe-area-inset-top) + 10px)"
                        : "10px",
                    paddingBottom: "10px",
                }}
                className={`fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b transition-all duration-200 ${
                    isDesktop ? "md:left-[280px]" : ""
                }`}
            >
                <div className="container mx-auto px-2 sm:px-6 lg:px-8 flex items-center justify-between min-h-[64px] overflow-visible gap-1 md:gap-4">
                    {/* Logo - Only show on mobile/tablet */}
                    {!isDesktop && (
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                                <img
                                    src="/Final-Logo-Arrangely-Logogram.png"
                                    alt="Logo Arrangely"
                                    className="w-5 h-5 object-contain"
                                />
                            </div>
                            <div className="flex flex-col justify-center">
                                <div className="flex items-center">
                                    <span className="text-lg font-bold leading-tight tracking-tight">
                                        Arrangely
                                    </span>
                                </div>
                                <UserPlanBadge />
                            </div>
                        </Link>
                    )}

                    {/* Home Icon + Search Bar - Desktop (Spotify-style integrated) */}
                    {isDesktop && (
                        <>
                            <GlobalSearchBar />
                            {/* <Link to="/download-app"> */}
                            {/* <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative"
                                onClick={handleDownloadRedirect} // Jalankan fungsi redirect
                            >
                                <Button
                                    size="sm"
                                    className="gap-2 bg-gradient-to-r from-primary via-primary-500 to-primary bg-[length:200%_100%] animate-[gradient_3s_ease-in-out_infinite] text-white shadow-lg shadow-primary/25 border-0"
                                >
                                    <Download className="h-4 w-4" />
                                    Get the App
                                </Button> */}
                            {/* Pulse effect */}
                            {/* <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                            </motion.div> */}
                            {/* </Link> */}
                        </>
                    )}

                    {/* Mobile Navigation Items */}
                    {!isNative &&
                        !isDesktop &&
                        (loading ? (
                            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
                                <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
                                {visibleNavItems.map((item) => (
                                    <NavLink key={item.path} item={item} />
                                ))}
                            </div>
                        ))}

                    <div className="flex items-center space-x-3 md:space-x-4">
                        <LanguageSwitcher />

                        {/* Tombol Create yang selalu muncul (Sebelum atau Sesudah Login) */}
                        {!loading && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                    variant="ghost"
                                    size="sm"
                                    className="
                                        gap-2
                                        rounded-full
                                        px-4
                                        py-2
                                        font-semibold
                                        bg-muted/60
                                        hover:bg-muted
                                        transition-colors
                                    "
                                    >
                                    <Plus className="h-4 w-4" />
                                    <span className="sm:inline">
                                        {t("common.create") || "Create"}
                                    </span>
                                    </Button>

                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                >
                                    <DropdownMenuItem
                                        onClick={() => {
                                            if (!user) {
                                                storeIntendedUrl(fullUrl);
                                                navigate("/auth");
                                            } else {
                                                navigate("/editor");
                                            }
                                        }}
                                    >
                                        <FileMusic className="h-4 w-4 mr-2" />
                                        Chord Lyrics
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            if (!user) {
                                                storeIntendedUrl(fullUrl);
                                                navigate("/auth");
                                            } else {
                                                navigate(
                                                    "/chord-grid-generator",
                                                );
                                            }
                                        }}
                                    >
                                        <Grid3X3 className="h-4 w-4 mr-2" />
                                        Chord Grid
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* BUTTON PROFILE DI HEADER */}
                        <div className="flex items-center overflow-visible">
                            {loading ? (
                                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                            ) : user ? (
                                <UserMenu isMobileView={!isDesktop} />
                            ) : (
                                <Link
                                    to="/auth"
                                    onClick={() => storeIntendedUrl(fullUrl)}
                                >
                                    <Button
                                        size="sm"
                                        className="font-semibold px-3 sm:px-4 text-xs sm:text-sm"
                                    >
                                        {t("nav.signIn")}
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {/* Sign in button for desktop when not logged in */}
                        {isDesktop && !user && !loading && (
                            <Link
                                to="/auth"
                                onClick={() => storeIntendedUrl(fullUrl)}
                            >
                                {/* <Button size="sm" className="font-semibold px-4">
                  {t("nav.signIn")}
                </Button> */}
                            </Link>
                        )}

                        {!isMobileView && !isNative && (
                            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                                <SheetTrigger asChild className="md:hidden">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="-mr-2"
                                    >
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="right"
                                    className="w-80 pt-[env(safe-area-inset-top)]"
                                >
                                    <div className="flex flex-col h-full mt-6">
                                        <div className="flex-grow">
                                            <div className="flex flex-col space-y-3">
                                                {visibleNavItems.map((item) => (
                                                    <NavLink
                                                        key={item.path}
                                                        item={item}
                                                    />
                                                ))}
                                                {!user && (
                                                    <Link
                                                        to="/auth"
                                                        onClick={() =>
                                                            setIsOpen(false)
                                                        }
                                                    >
                                                        <Button className="mt-4 w-full size-lg font-bold">
                                                            {t("nav.signIn")}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        )}
                    </div>
                </div>
            </nav>

            <GetAppFloatingBanner />

            {/* --- INI YANG TADI HILANG --- */}
            {/* Memunculkan Navigasi Bawah khusus Mobile */}
            {isNative && <MobileBottomNav />}

            {showAuth && (
                <AuthModal
                    isOpen={showAuth}
                    onClose={() => setShowAuth(false)}
                />
            )}
        </>
    );
};

export default DynamicNavigation;
