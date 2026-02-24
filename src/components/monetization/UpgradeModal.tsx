import { Crown, Star, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    onUpgrade?: () => void;
}

const UpgradeModal = ({
    isOpen,
    onClose,
    featureName = "this premium feature",
    onUpgrade,
}: UpgradeModalProps) => {
    const premiumFeatures = [
        "Unlimited access to premium arrangements",
        "Unlimited PDF downloads",
        "Full setlist manager",
        "Live performance view",
        "Early access to AI tools",
        "YouTube → chord extraction",
        "Priority support",
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-center">
                        <Crown className="h-6 w-6 text-accent" />
                        Upgrade to Premium
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="text-center">
                        <div className="mx-auto mb-4 p-4 bg-accent/10 rounded-full w-fit">
                            <Zap className="h-8 w-8 text-accent" />
                        </div>
                        <p className="text-muted-foreground">
                            You need Premium access to use{" "}
                            <span className="font-semibold text-primary">
                                {featureName}
                            </span>
                        </p>
                    </div>

                    <Card className="border-accent/20">
                        <CardHeader className="text-center pb-4">
                            <Badge className="bg-gradient-worship text-primary-foreground mx-auto mb-2">
                                Most Popular
                            </Badge>
                            <CardTitle className="flex items-center justify-center gap-2">
                                <Crown className="h-5 w-5" />
                                Premium Plan
                            </CardTitle>
                            <div className="mt-2">
                                <span className="text-3xl font-bold text-primary">
                                    Rp49.000
                                </span>
                                <span className="text-muted-foreground">
                                    /month
                                </span>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-3 mb-6">
                                {premiumFeatures
                                    .slice(0, 4)
                                    .map((feature, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3"
                                        >
                                            <Star className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                                            <span className="text-sm">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                <p className="text-sm text-muted-foreground">
                                    + much more...
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    className="w-full bg-gradient-worship hover:opacity-90"
                                    onClick={onUpgrade}
                                >
                                    Start Free Trial
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        /* Navigate to pricing page */
                                    }}
                                >
                                    View All Plans
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                            14-day free trial • Cancel anytime • No commitment
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UpgradeModal;
