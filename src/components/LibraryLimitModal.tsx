import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

interface LibraryLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCount: number;
    limit: number;
    isTrialing: boolean;
    onUpgrade?: () => void;
    onStartTrial?: () => Promise<void>;
}

export const LibraryLimitModal = ({
    isOpen,
    onClose,
    currentCount,
    limit,
    isTrialing,
}: LibraryLimitModalProps) => {
    const navigate = useNavigate();
    const hideIOSPricing = isCapacitorIOS();

    const handleUpgrade = () => {
        onClose();
        if (!hideIOSPricing) {
            navigate("/pricing");
        }
    };

    // Don't show the modal at all on iOS
    if (hideIOSPricing) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                        <DialogTitle className="text-xl">
                            Library Limit Reached
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">
                            You've reached your library limit:
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">
                                {currentCount} / {limit} songs
                            </span>
                            <div className="w-24 bg-background rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-warning"
                                    style={{
                                        width: `${Math.min(
                                            (currentCount / limit) * 100,
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {isTrialing ? (
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Free trial users can add up to{" "}
                                <strong>10 songs</strong> to their library.
                            </p>
                            <p className="text-sm">
                                Upgrade to add more songs and unlock premium
                                features!
                            </p>
                        </div>
                    ) : (
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Your current plan allows up to{" "}
                                <strong>{limit} songs</strong> in your library.
                            </p>
                            <p className="text-sm">
                                Upgrade to a higher plan to add more songs!
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                            <Crown className="h-4 w-4 text-primary" />
                            Available Plans:
                        </h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Basic Plan (Rp 29,000/month)</span>
                                <span className="font-medium">50 songs</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Premium Plan (Rp 39,000/month)</span>
                                <span className="font-medium">100 songs</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpgrade} className="flex-1">
                            <Crown className="h-4 w-4 mr-2" />
                            Upgrade Now
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
