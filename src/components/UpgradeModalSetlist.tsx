import { useNavigate } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

interface UpgradeModalSetlistProps {
    isOpen: boolean;
    onClose: () => void;
}

const UpgradeModalSetlist: React.FC<UpgradeModalSetlistProps> = ({
    isOpen,
    onClose,
}) => {
    const navigate = useNavigate();
    const hideIOSPricing = isCapacitorIOS();

    const handleUpgradeClick = () => {
        if (hideIOSPricing) {
            // On iOS, just close the modal (pricing not accessible)
            onClose();
            return;
        }
        navigate("/pricing");
        onClose();
    };

    // Don't show the modal at all on iOS
    if (hideIOSPricing) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Unlock Setlist Planner
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Unlock Performance Mode. This is a premium feature,
                        please upgrade your plan to continue.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpgradeClick}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        View Plans
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UpgradeModalSetlist;
