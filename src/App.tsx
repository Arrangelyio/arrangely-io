import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import OnboardingGuard from "./components/OnboardingGuard";
import RoleGuard from "./components/RoleGuard";
import DynamicNavigation from "./components/DynamicNavigation";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import Profile from "./pages/Profile";
import Index from "./pages/Index";
import Library from "./pages/Library";
import Browse from "./pages/Browse";
import Collaboration from "./pages/Collaboration";
import Editor from "./pages/Editor";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ProfileSetup from "./pages/ProfileSetup";
import Pricing from "./pages/Pricing";
import IOSPricingGuard from "./components/guards/IOSPricingGuard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCallback from "./pages/PaymentCallback";
import YouTubeImport from "./components/YouTubeImport";
import MP3Import from "./components/MP3Import";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PrivacyIndonesian from "./pages/PrivacyIndonesian";
import TermsIndonesian from "./pages/TermsIndonesian";
import Footer from "./components/legal/Footer";
import CookieConsent from "./components/legal/CookieConsent";
import NotFound from "./pages/NotFound";
import ArrangementDetail from "./pages/ArrangementDetail";
import LivePreview from "./pages/LivePreview";
import CreatorDashboard from "./pages/CreatorDashboard";
import ManageLessonContent from "./pages/creator/ManageLessonContent";
import CreatorProfile from "./pages/CreatorProfile";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import EventPaymentWaiting from "./pages/EventPaymentWaiting";
import EventTransactionHistory from "./pages/EventTransactionHistory";
import MyTickets from "./pages/MyTickets";
import EventCheckIn from "./pages/EventCheckIn";
import Marketplace from "./pages/Marketplace";
import TransactionHistory from "./pages/TransactionHistory";
import AISongAnalysis from "./pages/features/AISongAnalysis";
import RoleBasedRoute from "./components/RoleBasedRoute";
import ComingSoonPage from "./pages/ComingSoonPage";
import Recap2025 from "./pages/Recap2025";
import ChordLyricEditor from "./pages/features/ChordLyricEditor";
import InstantTranspose from "./pages/features/InstantTranspose";
import MobileOptimized from "./pages/features/MobileOptimized";
import SetlistPlannerPage from "./pages/features/SetlistPlanner";
import TeamCollaborationPage from "./pages/features/TeamCollaboration";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCreators from "./pages/admin/AdminCreators";
import AdminSongCreators from "./pages/admin/AdminSongCreators";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSongAnalytics from "./pages/admin/AdminSongAnalytics";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminContent from "./pages/admin/AdminContent";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminEventPayments from "./pages/admin/AdminEventPayments";
import AdminLessonPayments from "./pages/admin/AdminLessonPayments";
import AdminCreatorBenefits from "./pages/admin/AdminCreatorBenefits";
import AdminLibraryReports from "./pages/admin/AdminLibraryReports";
import AdminLessonBenefits from "./pages/admin/AdminLessonBenefits";
import AdminCreatorDashboard from "./pages/admin/AdminCreatorDashboard";
import AdminCreatorDetails from "./pages/admin/AdminCreatorDetails";
import AdminDiscountCodes from "./pages/admin/AdminDiscountCodes";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminTierAssessments from "./pages/admin/AdminTierAssessments";
import AdminSubscriptionPlans from "./pages/admin/AdminSubscriptionPlans";
import AdminChordMaster from "./pages/admin/AdminChordMaster";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminEventDetails from "./pages/admin/AdminEventDetails";
import AdminLessonSections from "./pages/admin/AdminLessonSections";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminLessonWhitelist from "./pages/admin/AdminLessonWhitelist";
import CertificateTemplates from "./pages/admin/CertificateTemplates";
import QRValidationMobile from "./components/events/QRValidationMobile";
import QRCheckin from "./pages/events/QRCheckin";
import AdminCheckinResult from "./pages/admin/AdminCheckinResult";
import AdminComments from "../src/components/admin/AdminComments";
import OrganizerEvents from "./pages/organizer/OrganizerEvents";
import EventPostEngagement from "./pages/organizer/EventPostEngagement";
import EventAttendeeHub from "./pages/events/EventAttendeeHub";
import Chat from "./pages/Chat";
import AdminChat from "./pages/admin/AdminChat";
import AdminBulkEmail from "./pages/admin/AdminBulkEmail";
import AdminEmailBlasts from "./pages/admin/AdminEmailBlasts";
import AdminEmailBlastDetail from "./pages/admin/AdminEmailBlastDetail";
import AdminPushNotifications from "./pages/admin/AdminPushNotifications";
import YouTubeRealtimeGenerate from "./pages/YouTubeRealtimeGenerate";
import ChordGridGenerator from "./pages/ChordGridGenerator";
import ChordScanner from "./pages/ChordScanner";
import SequencerStore from "./pages/SequencerStore";
import DesktopAppDownload from "./pages/DesktopAppDownload";
import Help from "./pages/Help";
import AIChordPage from "./pages/dashboard/AIChordPage";
import BecomeCreator from "./pages/BecomeCreator";
import CreatorProWelcome from "./pages/CreatorProWelcome";
import CreatorCommunityInfo from "./pages/CreatorCommunityInfo";
import CreatorProOnboardingProgress from "./components/onboarding/CreatorProOnboardingProgress";
import RequestSongs from "./pages/RequestSongs";
import Lessons from "./pages/Lessons";
import LessonDetail from "./pages/LessonDetail";
import CreateLesson from "./pages/CreateLesson";
import Learn from "./pages/Learn";
import MyProgress from "./pages/MyProgress";
import CertificateVerification from "./pages/CertificateVerification";
import PaymentChannelSelection from "./pages/PaymentChannelSelection";
import PaymentWaiting from "./pages/PaymentWaiting";
import LessonTransactions from "./pages/LessonTransactions";
import PaymentMethods from "./pages/PaymentMethods";
import MembershipDetails from "./pages/MembershipDetails";
import { FloatingChatWidget } from "./components/chatbot/FloatingChatWidget";
import { safariCacheBuster } from "./utils/safariCacheBuster";
import MainLayout from "./components/layout/MainLayout";
import Features from "./components/Features";
import BottomNavigation from "./components/mobile/BottomNavigation";
import AppBar from "./components/mobile/AppBar";
import { checkIsMobileView } from "./utils/mobileUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { MenuItem } from "./components/admin/AdminSidebar";
import ArtistSongsPage from "./pages/ArtistSongsPage";
import ArtistListPage from "./pages/ArtistListPage";
import SongListing from "./pages/SongListing";
import CreatorListPage from "./pages/CreatorListPage";
import Community from "./pages/Community";
import OfflineDownloads from "./pages/OfflineDownloads";
import OfflineLive from "./pages/OfflineLive";
import OfflineJoin from "./pages/OfflineJoin";
import OfflineGuestLive from "./pages/OfflineGuestLive";
import { Capacitor } from "@capacitor/core";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import ThumbnailDownloader from "./pages/ThumbnailDownloader";
import {
    LayoutDashboard,
    Users,
    Music,
    FileText,
    Settings,
    BarChart3,
    Shield,
    Database,
    CreditCard,
    MessageSquare,
    Award,
    Wallet,
    Package,
    CalendarDays,
    Guitar,
    Mail,
    BookOpen,
    Bell,
    UserCheck,
} from "lucide-react";
import AdminChatPage from "./pages/admin/AdminChatPage";
import AdminPlatformBenefitRules from "./pages/admin/AdminPlatformBenefitRules";
import AdminRoleManagement from "./pages/AdminRoleManagement";
import AdminCreatorTiers from "./pages/admin/AdminCreatorTiers";
import AdminReportsQueue from "./pages/admin/AdminReportsQueue";
import AdminScoreConfig from "./pages/admin/AdminScoreConfig";
import AdminSongReviews from "./pages/admin/AdminSongReviews";
import AdminCreatorScores from "./pages/admin/AdminCreatorScores";
import { Flag, Sliders, ClipboardCheck, TrendingUp } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
    const fullAdminMenuItems: MenuItem[] = [
        {
            id: "dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            path: "/admin-dashboard-secure-7f8e2a9c",
            end: true,
        },
        // --- Users & Creators ---
        {
            id: "group-users",
            label: "Users & Creators",
            icon: Users,
            path: "#",
            children: [
                {
                    id: "users",
                    label: "User Management",
                    icon: Users,
                    path: "/admin-dashboard-secure-7f8e2a9c/users",
                },
                {
                    id: "creators",
                    label: "Creator Applications",
                    icon: FileText,
                    path: "/admin-dashboard-secure-7f8e2a9c/creators",
                },
                {
                    id: "song-creators",
                    label: "Song Creators",
                    icon: Music,
                    path: "/admin-dashboard-secure-7f8e2a9c/song-creators",
                },
                {
                    id: "creator-dashboard",
                    label: "Creator Dashboard",
                    icon: Users,
                    path: "/admin-dashboard-secure-7f8e2a9c/creator-dashboard",
                },
            ],
        },
        // --- Content ---
        {
            id: "group-content",
            label: "Content",
            icon: Music,
            path: "#",
            children: [
                {
                    id: "content",
                    label: "Content Management",
                    icon: Music,
                    path: "/admin-dashboard-secure-7f8e2a9c/content",
                },
                {
                    id: "song-reviews",
                    label: "Song Reviews",
                    icon: ClipboardCheck,
                    path: "/admin-dashboard-secure-7f8e2a9c/song-reviews",
                },
                {
                    id: "request-songs",
                    label: "Request Songs",
                    icon: Music,
                    path: "/admin-dashboard-secure-7f8e2a9c/request-songs",
                },
                {
                    id: "chord-master",
                    label: "Chord Master",
                    icon: Guitar,
                    path: "/admin-dashboard-secure-7f8e2a9c/chord-master",
                },
                {
                    id: "comments",
                    label: "Comments",
                    icon: MessageSquare,
                    path: "/admin-dashboard-secure-7f8e2a9c/comments",
                },
            ],
        },
        // --- Lessons ---
        {
            id: "group-lessons",
            label: "Lessons",
            icon: BookOpen,
            path: "#",
            children: [
                {
                    id: "lessons",
                    label: "Lessons",
                    icon: BookOpen,
                    path: "/admin-dashboard-secure-7f8e2a9c/lessons",
                },
                {
                    id: "lesson-sections",
                    label: "Lesson Sections",
                    icon: Package,
                    path: "/admin-dashboard-secure-7f8e2a9c/lesson-sections",
                },
                {
                    id: "lesson-whitelist",
                    label: "Lesson Whitelist",
                    icon: UserCheck,
                    path: "/admin-dashboard-secure-7f8e2a9c/lesson-whitelist",
                },
                {
                    id: "tier-assessments",
                    label: "Test Your Level",
                    icon: Award,
                    path: "/admin-dashboard-secure-7f8e2a9c/tier-assessments",
                },
            ],
        },
        // --- Finance & Payments ---
        {
            id: "group-finance",
            label: "Finance",
            icon: CreditCard,
            path: "#",
            children: [
                {
                    id: "payments",
                    label: "Subscription Payments",
                    icon: CreditCard,
                    path: "/admin-dashboard-secure-7f8e2a9c/payments",
                },
                {
                    id: "event-payments",
                    label: "Event Payments",
                    icon: CreditCard,
                    path: "/admin-dashboard-secure-7f8e2a9c/event-payments",
                },
                {
                    id: "lesson-payments",
                    label: "Lesson Payments",
                    icon: CreditCard,
                    path: "/admin-dashboard-secure-7f8e2a9c/lesson-payments",
                },
                {
                    id: "subscription-plans",
                    label: "Subscription Plans",
                    icon: Package,
                    path: "/admin-dashboard-secure-7f8e2a9c/subscription-plans",
                },
                {
                    id: "discount-codes",
                    label: "Discount Codes",
                    icon: CreditCard,
                    path: "/admin-dashboard-secure-7f8e2a9c/discount-codes",
                },
                {
                    id: "withdrawals",
                    label: "Withdrawals",
                    icon: Wallet,
                    path: "/admin-dashboard-secure-7f8e2a9c/withdrawals",
                },
            ],
        },
        // --- Creator Economy ---
        {
            id: "group-creator-economy",
            label: "Creator Economy",
            icon: Award,
            path: "#",
            children: [
                {
                    id: "creator-benefits",
                    label: "Creator Benefits",
                    icon: Award,
                    path: "/admin-dashboard-secure-7f8e2a9c/creator-benefits",
                },
                {
                    id: "library-reports",
                    label: "Library Reports",
                    icon: Shield,
                    path: "/admin-dashboard-secure-7f8e2a9c/library-reports",
                },
                {
                    id: "creator-tiers",
                    label: "Creator Tiers",
                    icon: Award,
                    path: "/admin-dashboard-secure-7f8e2a9c/creator-tiers",
                },
                {
                    id: "creator-pro-reports",
                    label: "Creator Pro Reports",
                    icon: Flag,
                    path: "/admin-dashboard-secure-7f8e2a9c/creator-pro-reports",
                },
                {
                    id: "creator-scores-list",
                    label: "Creator Scores",
                    icon: TrendingUp,
                    path: "/admin-dashboard-secure-7f8e2a9c/creator-scores",
                },
                {
                    id: "creator-pro-scores",
                    label: "Score Config",
                    icon: Sliders,
                    path: "/admin-dashboard-secure-7f8e2a9c/creator-pro-scores",
                },
                {
                    id: "platform-benefit-rules",
                    label: "Global Benefit Rules",
                    icon: Settings,
                    path: "/admin-dashboard-secure-7f8e2a9c/platform-benefit-rules",
                },
                {
                    id: "lesson-benefits",
                    label: "Lesson Benefits",
                    icon: Award,
                    path: "/admin-dashboard-secure-7f8e2a9c/lesson-benefits",
                },
            ],
        },
        // --- Analytics & Reports ---
        {
            id: "group-analytics",
            label: "Analytics",
            icon: BarChart3,
            path: "#",
            children: [
                {
                    id: "song-analytics",
                    label: "Song Analytics",
                    icon: Music,
                    path: "/admin-dashboard-secure-7f8e2a9c/song-analytics",
                },
                {
                    id: "analytics",
                    label: "Analytics & Reports",
                    icon: BarChart3,
                    path: "/admin-dashboard-secure-7f8e2a9c/analytics",
                },
            ],
        },
        // --- Events ---
        {
            id: "events",
            label: "Events Management",
            icon: CalendarDays,
            path: "/admin-dashboard-secure-7f8e2a9c/events",
        },
        // --- Communication ---
        {
            id: "group-communication",
            label: "Communication",
            icon: Mail,
            path: "#",
            children: [
                {
                    id: "chat",
                    label: "Chat Support",
                    icon: MessageSquare,
                    path: "/admin-dashboard-secure-7f8e2a9c/chat",
                },
                {
                    id: "bulk-email",
                    label: "Bulk Email",
                    icon: Mail,
                    path: "/admin-dashboard-secure-7f8e2a9c/bulk-email",
                },
                {
                    id: "email-blasts",
                    label: "Email Blasts",
                    icon: Mail,
                    path: "/admin-dashboard-secure-7f8e2a9c/email-blasts",
                },
                {
                    id: "push-notifications",
                    label: "Push Notifications",
                    icon: Bell,
                    path: "/admin-dashboard-secure-7f8e2a9c/push-notifications",
                },
            ],
        },
        // --- System & Security ---
        {
            id: "group-system",
            label: "System & Security",
            icon: Shield,
            path: "#",
            children: [
                {
                    id: "security",
                    label: "Security",
                    icon: Shield,
                    path: "/admin-dashboard-secure-7f8e2a9c/security",
                },
                {
                    id: "system",
                    label: "System Health",
                    icon: Database,
                    path: "/admin-dashboard-secure-7f8e2a9c/system",
                },
                {
                    id: "role-management",
                    label: "Role Management",
                    icon: Shield,
                    path: "/admin-dashboard-secure-7f8e2a9c/role-management",
                },
                {
                    id: "settings",
                    label: "Settings",
                    icon: Settings,
                    path: "/admin-dashboard-secure-7f8e2a9c/settings",
                },
                {
                    id: "thumbnails",
                    label: "Download Thumbnails",
                    icon: Music,
                    path: "/download-thumbnails",
                },
            ],
        },
    ];

    const supportAdminMenuItems: MenuItem[] = [
        {
            id: "users",
            label: "User Management",
            icon: Users,
            path: "/support-dashboard/users",
        },
        {
            id: "applications",
            label: "Creator Applications",
            icon: FileText,
            path: "/support-dashboard/applications",
        },
        {
            id: "chat",
            label: "Chat Support",
            icon: MessageSquare,
            path: "/support-dashboard/chat",
        },
        {
            id: "request-songs",
            label: "Request Songs",
            icon: Music,
            path: "/support-dashboard/request-songs",
        },
    ];
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const isMobileView = useIsMobile();

    // Initialize push notifications for native platforms
    usePushNotifications();

    // Global deep link handler for Capacitor OAuth callback
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const handleDeepLink = async ({ url }: { url: string }) => {


            // Close the browser overlay
            try {
                await Browser.close();
            } catch (e) {

            }

            // Check if URL contains OAuth tokens
            if (url.includes("access_token") || url.includes("refresh_token")) {
                try {
                    const hashIndex = url.indexOf("#");
                    if (hashIndex !== -1) {
                        const hash = url.substring(hashIndex + 1);
                        const params = new URLSearchParams(hash);

                        const accessToken = params.get("access_token");
                        const refreshToken = params.get("refresh_token");

                        if (accessToken && refreshToken) {
                            console.log(
                                "✅ [App.tsx] Token found, setting Supabase session...",
                            );

                            const { error } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });

                            if (error) {
                                console.error("Session set error:", error);
                                navigate("/auth");
                                return;
                            }

                            console.log(
                                "✅ [App.tsx] Session set successfully, navigating to home...",
                            );
                            // Use navigate instead of window.location for smoother transition
                            navigate("/");
                        }
                    }
                } catch (error) {
                    console.error("Deep link processing error:", error);
                    navigate("/auth");
                }
            }
        };

        // Add the listener
        CapApp.addListener("appUrlOpen", handleDeepLink);

        return () => {
            CapApp.removeAllListeners();
        };
    }, [navigate]);

    useEffect(() => {
        const loader = document.getElementById("app-loader");
        if (loader) {
            // Memulai transisi fade-out
            loader.style.opacity = "0";

            // Menghapus elemen setelah transisi selesai
            setTimeout(() => {
                loader.remove();
            }, 500); // Durasi harus sama dengan transisi di CSS (0.5s)
        }

        // Safari cache clearing on app initialization
        const initSafariCacheBuster = async () => {
            if (safariCacheBuster.isSafari()) {
                // Clear caches if on auth page or if there are auth issues
                if (location.pathname === "/auth") {
                    await safariCacheBuster.clearAuthCaches();
                }

                // Check for stale session data and clear if needed
                const hasStaleData =
                    localStorage.getItem("arrangely_intended_url") &&
                    !localStorage.getItem("arrangely_intended_url_timestamp");
                if (hasStaleData) {
                    await safariCacheBuster.clearAllCaches();
                }
            }
        };

        initSafariCacheBuster();

        // Set up auth state listener for event banner
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [location.pathname]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [location.pathname]);

    const isLivePreviewRoute =
        location.pathname.startsWith("/live-preview") ||
        location.pathname.startsWith("/setlist-performance") ||
        location.pathname.startsWith("/learn") ||
        location.pathname.startsWith("/creator-dashboard") ||
        location.pathname.startsWith("/admin-dashboard-secure-7f8e2a9c") ||
        location.pathname.startsWith("/offline-live") ||
        location.pathname.startsWith("/support-dashboard");

    // Routes that should NOT show the sidebar (full-screen experiences)
    const isNoSidebarRoute =
        isLivePreviewRoute ||
        location.pathname.startsWith("/editor") ||
        location.pathname.startsWith("/chord-grid-generator") ||
        location.pathname.startsWith("/auth") ||
        location.pathname.startsWith("/profile-setup") ||
        location.pathname.startsWith("/payment") ||
        location.pathname.startsWith("/arrangement/") ||
        location.pathname === "/payment-success" ||
        location.pathname === "/payment-callback";

    const isLessonDetails =
        /^\/arrangely-music-lab\/[a-zA-Z0-9-]+(\/[a-zA-Z0-9-]+)?$/.test(
            location.pathname,
        ) ||
        /^\/events\/[a-zA-Z0-9-]+(\/[a-zA-Z0-9-]+)?$/.test(location.pathname);
    const isPaymentSuccessRoute =
        location.pathname === "/payment-success" ||
        /\/arrangely-music-lab\/[^/]+\/payment\/success$/.test(
            location.pathname,
        );
    const isEditorRoute =
        location.pathname === "/editor" ||
        location.pathname.startsWith("/chord-grid-generator");
    const isArrangementDetailRoute =
        location.pathname.startsWith("/arrangement/");

    return (
        <SubscriptionProvider>
            {/* Show regular navigation only if not mobile view and not using sidebar */}
            {!isLivePreviewRoute && !isPaymentSuccessRoute && (
                <DynamicNavigation isMobileView={isMobileView} />
            )}
            {location.pathname === "/" && <FloatingChatWidget />}

            {/* Persistent Creator Pro onboarding helper (hides itself when completed) */}
            {/* {!isLivePreviewRoute && <CreatorProOnboardingProgress />} */}

            {/* Main content with sidebar layout */}
            <MainLayout showSidebar={!isNoSidebarRoute}>
                {/* Add padding for mobile view to account for fixed AppBar and BottomNavigation */}
                <div className={isMobileView ? "pt-0 pb-16" : ""}>
                    {/* <OnboardingGuard> */}
                    <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/library" element={<Library />} />
                        <Route
                            path="/offline-downloads"
                            element={<OfflineDownloads />}
                        />
                        <Route path="/offline-join" element={<OfflineJoin />} />
                        <Route
                            path="/offline-guest"
                            element={<OfflineGuestLive />}
                        />
                        <Route
                            path="/offline-live/:setlistId/:songId?"
                            element={<LivePreview />}
                        />
                        <Route
                            path="/collaboration"
                            element={<Collaboration />}
                        />
                        <Route path="/editor" element={<Editor />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route
                            path="/auth-callback"
                            element={<AuthCallback />}
                        />
                        <Route
                            path="/profile-setup"
                            element={<ProfileSetup />}
                        />
                        <Route path="/pricing" element={<IOSPricingGuard><Pricing /></IOSPricingGuard>} />
                        <Route
                            path="/payment-success"
                            element={<PaymentSuccess />}
                        />
                        <Route
                            path="/payment-callback"
                            element={<PaymentCallback />}
                        />
                        <Route
                            path="/youtube-import"
                            element={<YouTubeImport />}
                        />
                        <Route path="/mp3-import" element={<MP3Import />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/features" element={<Features />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route
                            path="/privacy/kebijakan-privasi"
                            element={<PrivacyIndonesian />}
                        />
                        <Route
                            path="/terms/syarat-ketentuan"
                            element={<TermsIndonesian />}
                        />
                        <Route
                            path="/creator-dashboard"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["creator", "admin"]}
                                >
                                    <CreatorDashboard />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/creator/arrangely-music-lab/:lessonId/content"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["creator", "admin"]}
                                >
                                    <ManageLessonContent />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/creator-profile/:creatorId"
                            element={<CreatorProfile />}
                        />
                        <Route
                            path="/creator/:slug"
                            element={<CreatorProfile />}
                        />
                        <Route
                            path="/creators"
                            element={<CreatorListPage />}
                        />
                        <Route path="/events" element={<Events />} />
                        <Route path="/event/:slug" element={<EventDetail />} />
                        <Route
                            path="/events/:eventId"
                            element={<EventDetail />}
                        />
                        <Route
                            path="/events/payment/:paymentId"
                            element={<EventPaymentWaiting />}
                        />
                        <Route
                            path="/events/transactions"
                            element={<EventTransactionHistory />}
                        />
                        <Route
                            path="/events/checkin/:qrToken"
                            element={<QRCheckin />}
                        />
                        <Route
                            path="/arrangely-music-lab"
                            element={<Lessons />}
                        />
                        <Route
                            path="/arrangely-music-lab/:slug"
                            element={<LessonDetail />}
                        />
                        <Route
                            path="/arrangely-music-lab/:slug/payment/channel"
                            element={<IOSPricingGuard><PaymentChannelSelection /></IOSPricingGuard>}
                        />
                        <Route
                            path="/arrangely-music-lab/:slug/payment/waiting/:orderId"
                            element={<PaymentWaiting />}
                        />
                        <Route
                            path="/arrangely-music-lab/transactions"
                            element={<LessonTransactions />}
                        />
                        <Route
                            path="/arrangely-music-lab/:slug/payment/success"
                            element={<PaymentSuccess />}
                        />
                        <Route
                            path="/arrangely-music-lab/:slug/payment/channel"
                            element={<PaymentChannelSelection />}
                        />
                        <Route
                            path="/arrangely-music-lab/:slug/payment/waiting/:orderId"
                            element={<PaymentWaiting />}
                        />
                        <Route
                            path="/arrangely-music-lab/transactions"
                            element={<LessonTransactions />}
                        />
                        <Route
                            path="/payment-methods"
                            element={<PaymentMethods />}
                        />
                        <Route
                            path="/membership"
                            element={<MembershipDetails />}
                        />
                        <Route
                            path="/create-lesson"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["creator", "admin"]}
                                >
                                    <CreateLesson />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/learn/:lessonId"
                            element={
                                <OnboardingGuard>
                                    <Learn />
                                </OnboardingGuard>
                            }
                        />
                        <Route
                            path="/my-progress"
                            element={
                                <OnboardingGuard>
                                    <MyProgress />
                                </OnboardingGuard>
                            }
                        />
                        <Route
                            path="/certificate/verify/:serialNumber"
                            element={<CertificateVerification />}
                        />
                        <Route
                            path="/event/checkin/:ticketNumber"
                            element={<EventCheckIn />}
                        />
                        <Route path="/my-tickets" element={<MyTickets />} />
                        <Route
                            path="/organizer/events"
                            element={
                                <OnboardingGuard>
                                    <OrganizerEvents />
                                </OnboardingGuard>
                            }
                        />
                        <Route
                            path="/organizer/events/:eventId/engagement"
                            element={
                                <OnboardingGuard>
                                    <EventPostEngagement />
                                </OnboardingGuard>
                            }
                        />
                        <Route
                            path="/events/:eventId/hub"
                            element={
                                <OnboardingGuard>
                                    <EventAttendeeHub />
                                </OnboardingGuard>
                            }
                        />
                        <Route
                            path="/qr-validation"
                            element={
                                <OnboardingGuard>
                                    <QRValidationMobile />
                                </OnboardingGuard>
                            }
                        />
                        <Route
                            path="/marketplace"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["creator", "admin"]}
                                    fallbackTitle="Marketplace - Coming Soon"
                                    fallbackDescription="The marketplace feature is currently being developed for creators and admins."
                                >
                                    <Marketplace />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/community-library"
                            element={
                                <RoleBasedRoute fallbackTitle="Community Library - Coming Soon">
                                    <Browse />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/download-thumbnails"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["admin", "creator"]}
                                >
                                    <ThumbnailDownloader />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/artist/:artistName"
                            element={<ArtistSongsPage />}
                        />
                        <Route path="/artists" element={<ArtistListPage />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/songs" element={<SongListing />} />
                        <Route
                            path="/transactions"
                            element={
                                <RoleBasedRoute fallbackTitle="Transactions - Coming Soon">
                                    <TransactionHistory />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/features/ai-song-analysis"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["creator", "admin"]}
                                >
                                    <AISongAnalysis />
                                </RoleBasedRoute>
                            }
                        />

                        {/* YouTube Real-time Chord Generation */}
                        <Route
                            path="/youtube-realtime-generate"
                            element={<YouTubeRealtimeGenerate />}
                        />

                        {/* Chord Grid Generator */}
                        <Route
                            path="/chord-grid-generator"
                            element={<ChordGridGenerator />}
                        />

                        {/* Chord Scanner */}
                        <Route
                            path="/chord-scanner"
                            element={<ChordScanner />}
                        />

                        {/* Sequencer Store */}
                        <Route
                            path="/sequencer-store"
                            element={<SequencerStore />}
                        />
                        <Route
                            path="/download-app"
                            element={<DesktopAppDownload />}
                        />

                        <Route
                            path="/ai-studio"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["creator", "admin"]}
                                >
                                    <AIChordPage />
                                </RoleBasedRoute>
                            }
                        />

                        {/* Chat Routes */}
                        <Route path="/chat" element={<Chat />} />

                        {/* Help Center */}
                        <Route path="/help" element={<Help />} />

                        {/* Become Creator */}
                        <Route
                            path="/become-creator"
                            element={
                                <RoleBasedRoute>
                                    <BecomeCreator />
                                </RoleBasedRoute>
                            }
                        />

                        {/* Creator Pro Welcome/Onboarding */}
                        <Route
                            path="/creator-pro-welcome"
                            element={<CreatorProWelcome />}
                        />

                        {/* Creator Community Info Landing Page */}
                        <Route
                            path="/creator-community"
                            element={<CreatorCommunityInfo />}
                        />

                        <Route
                            path="/admin/chat/:id"
                            element={
                                <RoleBasedRoute allowedRoles={["admin"]}>
                                    <AdminChatPage />
                                </RoleBasedRoute>
                            }
                        />

                        {/* Admin Routes */}
                        <Route
                            path="/events/checkin-result/:qrToken"
                            element={
                                <RoleBasedRoute allowedRoles={["admin"]}>
                                    <AdminCheckinResult />
                                </RoleBasedRoute>
                            }
                        />
                        <Route
                            path="/support-dashboard"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["admin", "support_admin"]}
                                >
                                    <AdminLayout
                                        menuItems={supportAdminMenuItems}
                                    />
                                </RoleBasedRoute>
                            }
                        >
                            <Route index element={<AdminUsers />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route
                                path="applications"
                                element={<AdminCreators />}
                            />
                            <Route path="chat" element={<AdminChat />} />
                            <Route
                                path="request-songs"
                                element={<RequestSongs />}
                            />
                        </Route>

                        {/* RUTE LAMA UNTUK ADMIN PENUH */}
                        <Route
                            path="/admin-dashboard-secure-7f8e2a9c"
                            element={
                                <RoleBasedRoute
                                    allowedRoles={["admin", "support_admin"]}
                                >
                                    <AdminLayout
                                        menuItems={fullAdminMenuItems}
                                    />
                                </RoleBasedRoute>
                            }
                        >
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route
                                path="creators"
                                element={<AdminCreators />}
                            />
                            <Route
                                path="song-creators"
                                element={<AdminSongCreators />}
                            />
                            <Route path="content" element={<AdminContent />} />
                            <Route
                                path="song-reviews"
                                element={<AdminSongReviews />}
                            />
                            <Route
                                path="song-analytics"
                                element={<AdminSongAnalytics />}
                            />
                            <Route
                                path="comments"
                                element={<AdminComments />}
                            />
                            <Route path="events" element={<AdminEvents />} />
                            <Route
                                path="events/:eventId"
                                element={<AdminEventDetails />}
                            />
                            <Route
                                path="analytics"
                                element={<AdminAnalytics />}
                            />
                            <Route
                                path="payments"
                                element={<AdminPayments />}
                            />
                            <Route
                                path="event-payments"
                                element={<AdminEventPayments />}
                            />
                            <Route
                                path="lesson-payments"
                                element={<AdminLessonPayments />}
                            />
                            <Route
                                path="creator-benefits"
                                element={<AdminCreatorBenefits />}
                            />
                            <Route
                                path="library-reports"
                                element={<AdminLibraryReports />}
                            />
                            <Route
                                path="creator-tiers"
                                element={<AdminCreatorTiers />}
                            />
                            <Route
                                path="creator-pro-reports"
                                element={<AdminReportsQueue />}
                            />
                            <Route
                                path="creator-scores"
                                element={<AdminCreatorScores />}
                            />
                            <Route
                                path="creator-pro-scores"
                                element={<AdminScoreConfig />}
                            />
                            <Route
                                path="platform-benefit-rules"
                                element={<AdminPlatformBenefitRules />}
                            />
                            <Route
                                path="lesson-benefits"
                                element={<AdminLessonBenefits />}
                            />
                            <Route
                                path="discount-codes"
                                element={<AdminDiscountCodes />}
                            />
                            <Route
                                path="withdrawals"
                                element={<AdminWithdrawals />}
                            />
                            <Route
                                path="subscription-plans"
                                element={<AdminSubscriptionPlans />}
                            />
                            <Route
                                path="chord-master"
                                element={<AdminChordMaster />}
                            />
                            <Route path="lessons" element={<AdminLessons />} />
                            <Route
                                path="lesson-sections"
                                element={<AdminLessonSections />}
                            />
                            <Route
                                path="lesson-whitelist"
                                element={<AdminLessonWhitelist />}
                            />
                            <Route
                                path="certificate-templates"
                                element={<CertificateTemplates />}
                            />
                            <Route
                                path="tier-assessments"
                                element={<AdminTierAssessments />}
                            />
                            <Route
                                path="request-songs"
                                element={<RequestSongs />}
                            />
                            <Route
                                path="creator-dashboard"
                                element={<AdminCreatorDashboard />}
                            />
                            <Route
                                path="creator-dashboard/:creatorId"
                                element={<AdminCreatorDetails />}
                            />
                            <Route path="chat" element={<AdminChat />} />
                            <Route
                                path="bulk-email"
                                element={<AdminBulkEmail />}
                            />
                            <Route
                                path="email-blasts"
                                element={<AdminEmailBlasts />}
                            />
                            <Route
                                path="email-blasts/:blastId"
                                element={<AdminEmailBlastDetail />}
                            />
                            <Route
                                path="push-notifications"
                                element={<AdminPushNotifications />}
                            />
                            <Route
                                path="security"
                                element={<AdminSecurity />}
                            />
                            <Route
                                path="system"
                                element={<AdminSystemHealth />}
                            />
                            <Route
                                path="role-management"
                                element={<AdminRoleManagement />}
                            />
                            <Route
                                path="settings"
                                element={<ComingSoonPage />}
                            />
                        </Route>

                        {/* Coming Soon route */}
                        <Route
                            path="/coming-soon"
                            element={<ComingSoonPage />}
                        />
                        {/* <Route path="/recap-2025" element={<Recap2025 />} /> */}
                        <Route
                            path="/features/chord-lyric-editor"
                            element={<ChordLyricEditor />}
                        />
                        <Route
                            path="/features/instant-transpose"
                            element={<InstantTranspose />}
                        />
                        <Route
                            path="/features/mobile-optimized"
                            element={<MobileOptimized />}
                        />
                        <Route
                            path="/features/setlist-planner"
                            element={<SetlistPlannerPage />}
                        />
                        <Route
                            path="/features/team-collaboration"
                            element={<TeamCollaborationPage />}
                        />
                        <Route
                            path="/arrangement/:id/:slug"
                            element={<ArrangementDetail />}
                        />
                        <Route
                            path="/events/:id/:slug"
                            element={<EventDetail />}
                        />
                        <Route
                            path="/live-preview/:id/:slug"
                            element={<LivePreview />}
                        />
                        <Route
                            path="/setlist-performance/:setlistId/:songId/:slug"
                            element={<LivePreview />}
                        />

                        {/* SEO-friendly slug routes */}
                        <Route
                            path="/song/:slug"
                            element={<ArrangementDetail />}
                        />
                        <Route path="/live/:slug" element={<LivePreview />} />
                        <Route
                            path="/setlist/:slug/:songSlug?"
                            element={<LivePreview />}
                        />

                        {/* Fallback ID routes for backward compatibility */}
                        <Route
                            path="/arrangement/:id"
                            element={<ArrangementDetail />}
                        />
                        <Route
                            path="/live-preview/:id"
                            element={<LivePreview />}
                        />
                        <Route
                            path="/setlist-performance/:setlistId/:songId?"
                            element={<LivePreview />}
                        />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </MainLayout>
            {/* </OnboardingGuard> */}

            {!isLivePreviewRoute &&
                !isPaymentSuccessRoute &&
                !isEditorRoute &&
                !isMobileView && <Footer />}

            {/* CookieConsent HANYA muncul di Homepage */}
            {location.pathname === "/" && !Capacitor.isNativePlatform() && (
                <CookieConsent />
            )}

            {/* Show BottomNavigation for mobile view */}
            {!isLivePreviewRoute && !isLessonDetails && isMobileView && (
                <BottomNavigation />
            )}
        </SubscriptionProvider>
    );
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
