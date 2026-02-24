import { cn } from "@/lib/utils";
import { ShieldCheck, Users, Music } from "lucide-react";

export type MarketplaceTab = "verified" | "community" | "all";

interface MarketplaceTabsProps {
    activeTab: MarketplaceTab;
    onTabChange: (tab: MarketplaceTab) => void;
    className?: string;
    verifiedCount?: number;
    communityCount?: number;
    allCount?: number;
}

const tabConfig: {
    value: MarketplaceTab;
    label: string;
    icon: typeof ShieldCheck;
    accentColor: string;
}[] = [
    {
        value: "verified",
        label: "Verified",
        icon: ShieldCheck,
        accentColor: "text-blue-400 border-blue-400",
    },
    {
        value: "community",
        label: "Community",
        icon: Users,
        accentColor: "text-purple-400 border-purple-400",
    },
    {
        value: "all",
        label: "All",
        icon: Music,
        accentColor: "text-foreground border-foreground",
    },
];

export function MarketplaceTabs({
    activeTab,
    onTabChange,
    className,
    verifiedCount,
    communityCount,
    allCount,
}: MarketplaceTabsProps) {
    const getCount = (tab: MarketplaceTab) => {
        if (tab === "verified") return verifiedCount;
        if (tab === "community") return communityCount;
        if (tab === "all") return allCount;
        return undefined;
    };

    return (
        <div className={cn("w-full pt-6", className)}>
            <div className="flex items-center gap-6 sm:gap-8 border-b border-border/50">
                {tabConfig.map((tab) => {
                    const isActive = activeTab === tab.value;
                    const count = getCount(tab.value);
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.value}
                            onClick={() => onTabChange(tab.value)}
                            className={cn(
                                "relative flex items-center gap-2 py-3 text-sm font-medium transition-colors",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                isActive
                                    ? tab.accentColor.split(" ")[0]
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                            {typeof count === "number" && (
                                <span className="text-xs opacity-60">
                                    ({count})
                                </span>
                            )}

                            {/* Animated underline indicator */}
                            <span
                                className={cn(
                                    "absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200",
                                    isActive
                                        ? cn(
                                              "opacity-100",
                                              tab.accentColor
                                                  .split(" ")[1]
                                                  ?.replace("border-", "bg-"),
                                          )
                                        : "opacity-0 bg-transparent",
                                )}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default MarketplaceTabs;
