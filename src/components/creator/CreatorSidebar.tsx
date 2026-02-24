import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Music,
    Package,
    DollarSign,
    Settings,
    User,
    Users,
    FileText,
    Menu,
    Guitar,
    Calendar,
    BookOpen,
    MessageSquare,
    Video,
    Disc,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface CreatorSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

const CreatorSidebar = ({
    isOpen,
    onToggle,
    activeTab = "overview",
    onTabChange,
}: CreatorSidebarProps) => {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [creatorType, setCreatorType] = useState<string | null>(null);
    const [isInternal, setIsInternal] = useState<boolean>(false);

    useEffect(() => {
        const getUserRole = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role, creator_type, is_internal")
                    .eq("user_id", user.id)
                    .single();
                setUserRole(profile?.role || "user");
                setCreatorType(profile?.creator_type || null);
                setIsInternal(profile?.is_internal || false);
            }
        };
        getUserRole();
    }, []);

    const menuItems = [
        { id: "overview", label: "Dashboard", icon: LayoutDashboard },
        { id: "arrangements", label: "My Arrangements", icon: Music },
        { id: "lessons", label: "Music Lab", icon: BookOpen },
        // { id: "events", label: "Events", icon: Calendar },
        // { id: "bundles", label: "Bundles", icon: Package },
        // { id: "earnings", label: "Arrangement Earnings", icon: DollarSign },
        { id: "lesson-earnings", label: "Music Lab Earnings", icon: BookOpen },
        { id: "sequencer-earnings", label: "Sequencer Earnings", icon: Disc },
        { id: "vouchers", label: "Discount Codes", icon: FileText },
        // {
        //     id: "chord-master",
        //     label: "Chord Master",
        //     icon: Guitar,
        // },
        // { id: "profile", label: "Public Profile", icon: User },
        // { id: "pro-upgrade", label: "Pro Upgrade", icon: Settings },
        // { id: "settings", label: "Settings", icon: Settings },
    ];

    const requestSongsItem = {
        id: "request-songs",
        label: "Request Songs",
        icon: Music,
    };

    // Add admin-only items
    const adminItems = [
        { id: "applications", label: "Creator Applications", icon: FileText },
        { id: "users", label: "User Management", icon: Users },
    ];

    const supportAdminItems = [
        { id: "users", label: "User Management", icon: Users },
        { id: "applications", label: "Creator Applications", icon: FileText },
        { id: "chat-support", label: "Chat Support", icon: MessageSquare }, // Menu baru
        requestSongsItem,
    ];

    const creatorProItems = [
        { id: "overview", label: "Dashboard", icon: LayoutDashboard },
        { id: "arrangements", label: "My Arrangements", icon: Music },
        { id: "vouchers", label: "Discount Codes", icon: FileText },
    ];

    // Request songs menu for Arrangely creators and admins
    const showRequestSongs =
        userRole === "admin" ||
        (userRole === "creator" && creatorType === "creator_arrangely");
    let allItems = menuItems;

    if (userRole === "admin") {
        allItems = [...menuItems, ...adminItems, requestSongsItem];
    } else if (userRole === "support_admin") {
        allItems = [...menuItems, ...adminItems, requestSongsItem];
    } else if (userRole === "creator" && creatorType === "creator_arrangely") {
        allItems = [...menuItems, requestSongsItem];
    } else if (userRole === "creator" && creatorType === "creator_pro") {
        // LOGIKA BARU: Jika Pro dan Internal, tambahkan Request Songs
        if (isInternal) {
            allItems = [...creatorProItems, requestSongsItem];
        } else {
            allItems = creatorProItems;
        }
    }

    return (
        <div
            className={cn(
                "bg-card border-r border-border h-screen sticky top-0 transition-all duration-300",
                isOpen ? "w-64" : "w-16",
            )}
        >
            <div className="p-6 border-b border-border flex items-center justify-between">
                {isOpen && (
                    <div>
                        <h2 className="text-xl font-bold text-primary">
                            {userRole === "admin" ? "Admin Hub" : "Creator Hub"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {userRole === "admin"
                                ? "Manage platform & creators"
                                : "Manage your arrangements"}
                        </p>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            <nav className="p-4 space-y-2">
                {allItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange?.(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                            activeTab === item.id
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-primary hover:bg-muted",
                        )}
                        title={!isOpen ? item.label : undefined}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {isOpen && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default CreatorSidebar;
