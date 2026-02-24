import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { LogOut, User as UserIcon, Tags, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logAuthError, logDatabaseError } from "@/utils/errorLogger";
import { clearIntendedUrl } from "@/utils/redirectUtils";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUserRole } from "@/hooks/useUserRole";
import PremiumBadge from "@/components/monetization/PremiumBadge";
import VerifiedBadge from "@/components/ui/verified-badge";

type UserMenuProps = {
  isMobileView?: boolean; // optional, default false kalau nggak dikirim
};

const UserMenu: React.FC<UserMenuProps> = ({ isMobileView = false }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();
    const { subscriptionStatus, loading: subscriptionLoading } =
        useSubscription();
    const { isCreator } = useUserRole();

    useEffect(() => {
        const getUser = async () => {
            setLoading(true);
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    const { data: profile, error } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("user_id", user.id)
                        .single();

                    if (error) {
                        await logDatabaseError(
                            error,
                            "fetch_profile",
                            "profiles",
                            { user_id: user.id }
                        );
                    } else {
                        setProfile(profile);
                    }
                }
            } catch (error: any) {
                await logAuthError(error, "get_user");
            } finally {
                setLoading(false);
            }
        };

        getUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);
            if (!session) {
                setProfile(null);
                window.location.href = "/auth";
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleLogout = () => {
        // Use synchronous wrapper to prevent click event issues
        supabase.auth.signOut()
            .then(({ error }) => {
                if (error) {
                    logAuthError(error, "logout");
                    toast({
                        title: "Logout Failed",
                        description: error.message,
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: "Logged Out",
                        description: "You have been successfully logged out.",
                    });
                    clearIntendedUrl();
                    // Force navigation after successful logout
                    window.location.href = "/auth";
                }
            })
            .catch((error: any) => {
                logAuthError(error, "logout");
                toast({
                    title: "Logout Failed",
                    description: "An unexpected error occurred.",
                    variant: "destructive",
                });
            });
    };

    if (loading) {
        return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
    }

    if (!user) {
        return (
            <Button
                variant="outline"
                onClick={() => navigate("/auth")}
                className="flex items-center gap-2"
            >
                <UserIcon className="h-4 w-4" />
                Sign In
            </Button>
        );
    }

    const displayName =
        profile?.display_name || user.email?.split("@")[0] || "User";
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                >
                    <Avatar className="h-8 w-8">
                        <AvatarImage
                            src={profile?.avatar_url || undefined}
                            alt={displayName}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    {profile?.creator_type === 'creator_professional' && (
                        <div className="absolute -bottom-1 -right-1">
                            <VerifiedBadge size="sm" />
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div>
                                    <p className="text-sm font-medium leading-none">
                                        {displayName}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user.email}
                                    </p>
                                </div>
                                {profile?.creator_type === 'creator_professional' && (
                                    <VerifiedBadge size="sm" />
                                )}
                            </div>
                        </div>
                        {!subscriptionLoading && (
                            <div>
                                {/* {subscriptionStatus?.hasActiveSubscription || subscriptionStatus?.isTrialing ? (
                                    <PremiumBadge variant="small" />
                                ) : (
                                    <PremiumBadge variant="basic" />
                                )} */}
                            </div>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/pricing")}>
                    <Tags className="mr-2 h-4 w-4" />
                    <span>Pricing</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/arrangely-music-lab/transactions")}>
                    <Receipt className="mr-2 h-4 w-4" />
                    <span>My Lesson Transactions</span>
                </DropdownMenuItem>
                {isCreator && isMobileView && (
                <DropdownMenuItem onClick={() => navigate("/creator-dashboard")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Creator Dashboard</span>
                </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserMenu;
