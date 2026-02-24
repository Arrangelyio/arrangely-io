import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DiscountEarnings {
    total_earnings: number;
    total_uses: number;
    monthly_earnings: number;
}

interface DiscountBenefit {
    id: string;
    original_amount: number;
    discount_amount: number;
    creator_benefit_amount: number;
    created_at: string;
    discount_codes: {
        code: string;
    };
    profiles: {
        display_name: string;
    };
}

interface DiscountCodeEarningsProps {
    creatorId: string;
}

const DiscountCodeEarnings = ({ creatorId }: DiscountCodeEarningsProps) => {
    const [earnings, setEarnings] = useState<DiscountEarnings>({
        total_earnings: 0,
        total_uses: 0,
        monthly_earnings: 0,
    });
    const [benefits, setBenefits] = useState<DiscountBenefit[]>([]);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchEarnings();
        if (showBreakdown) {
            fetchBenefitsBreakdown();
        }
    }, [creatorId, showBreakdown]);

    const fetchEarnings = async () => {
        try {
            const { data, error } = await supabase.rpc(
                "get_creator_discount_earnings",
                { creator_id: creatorId }
            );

            if (error) throw error;
            if (data && data.length > 0) {
                setEarnings(data[0]);
            }
        } catch (error) {
            console.error("Error fetching discount earnings:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch discount code earnings",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchBenefitsBreakdown = async () => {
    try {
        const { data, error } = await supabase
            .from("creator_discount_benefits")
            .select(`
                id,
                original_amount,
                discount_amount,
                creator_benefit_amount,
                created_at,
                discount_codes!inner(code)
            `)
            .eq("creator_id", creatorId)
            .eq("is_production", true)
            .order("created_at", { ascending: false });

        if (error) throw error;
        setBenefits(data || []);
    } catch (error) {
        console.error("Error fetching benefits breakdown:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch benefits breakdown",
        });
    }
};


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Discount Code Earnings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Discount Code Earnings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Coins className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                Total Earnings
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                            {formatCurrency(earnings.total_earnings)}
                        </div>
                    </div>

                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                Total Uses
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                            {earnings.total_uses}
                        </div>
                    </div>

                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                This Month
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                            {formatCurrency(earnings.monthly_earnings)}
                        </div>
                    </div>
                </div>

                {earnings.total_uses > 0 && (
                    <div>
                        <Button
                            variant="outline"
                            onClick={() => setShowBreakdown(!showBreakdown)}
                            className="w-full"
                        >
                            {showBreakdown ? (
                                <>
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Hide Breakdown
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Show Breakdown
                                </>
                            )}
                        </Button>

                        {showBreakdown && (
                            <div className="mt-4 space-y-3">
                                <h4 className="font-medium">
                                    Transaction Breakdown
                                </h4>
                                {benefits.map((benefit) => (
                                    <div
                                        key={benefit.id}
                                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {benefit.profiles
                                                    ?.display_name || "User"}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Code:{" "}
                                                <Badge variant="outline">
                                                    {
                                                        benefit.discount_codes
                                                            ?.code
                                                    }
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(
                                                    benefit.created_at
                                                ).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-primary">
                                                {formatCurrency(
                                                    benefit.creator_benefit_amount
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                from{" "}
                                                {formatCurrency(
                                                    benefit.discount_amount
                                                )}{" "}
                                                discount
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {earnings.total_uses === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                        <Coins className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No discount code earnings yet</p>
                        <p className="text-sm">
                            Ask admin to assign discount codes to you
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DiscountCodeEarnings;
