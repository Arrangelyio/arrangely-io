import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrialInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: any;
    trialInfo: any;
}

const TrialInfoModal = ({
    isOpen,
    onClose,
    plan,
    trialInfo,
}: TrialInfoModalProps) => {
    if (!isOpen || !plan) {
        return null;
    }

    const trialEndDate = trialInfo?.endDate
        ? new Date(trialInfo.endDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : "";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                        <Crown className="h-8 w-8 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">
                        Your Free Trial
                    </DialogTitle>
                    <p className="text-muted-foreground pt-1">
                        You are currently enjoying all premium features for
                        free.
                    </p>
                    {trialEndDate && (
                        <Badge variant="secondary" className="mx-auto mt-2">
                            Trial ends on {trialEndDate}
                        </Badge>
                    )}
                </DialogHeader>

                <div className="text-center my-4">
                    <div className="flex justify-center items-center gap-2">
                        <span className="text-4xl font-bold text-gray-400 line-through">
                            {`Rp${(30000).toLocaleString("id-ID")}`}
                        </span>
                        <span className="text-4xl font-bold text-primary">
                            Free
                        </span>
                    </div>
                    <span className="text-muted-foreground">/for 7 days</span>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">
                        Included Premium Features
                    </h4>
                    {plan.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                        </div>
                    ))}
                </div>

                <DialogFooter className="mt-6">
                    <Button onClick={onClose} className="w-full">
                        Continue Exploring
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TrialInfoModal;
