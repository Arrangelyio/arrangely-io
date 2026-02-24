import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept?: () => void;
    title?: string;
    context?: "registration" | "payment" | "publishing";
}

const TermsModal = ({
    isOpen,
    onClose,
    onAccept,
    title = "Terms of Service",
    context = "registration",
}: TermsModalProps) => {
    const getContextualContent = () => {
        switch (context) {
            case "payment":
                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Payment Terms</h3>
                        <p className="text-sm text-muted-foreground">
                            By proceeding with payment, you agree to our
                            subscription terms, automatic renewal policy, and
                            refund conditions as outlined in our full Terms of
                            Service.
                        </p>
                    </div>
                );
            case "publishing":
                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold">
                            Content Publishing Terms
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            By publishing content, you confirm you own or have
                            proper licensing for the material, and grant
                            Arrangely necessary rights to display and distribute
                            your arrangements.
                        </p>
                    </div>
                );
            default:
                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Account Registration</h3>
                        <p className="text-sm text-muted-foreground">
                            By creating an account, you agree to provide
                            accurate information and comply with our community
                            guidelines and platform rules.
                        </p>
                    </div>
                );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                        {getContextualContent()}

                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3">
                                Key Terms Summary
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• You must be 18+ to use our service</li>
                                <li>
                                    • Respect intellectual property and
                                    copyright laws
                                </li>
                                <li>
                                    • Use the platform responsibly and legally
                                </li>
                                <li>
                                    • We may terminate accounts for policy
                                    violations
                                </li>
                                <li>
                                    • Subscription payments are processed
                                    securely
                                </li>
                                <li>
                                    • Your content remains your intellectual
                                    property
                                </li>
                            </ul>
                        </div>

                        <div className="border-t pt-8">
                            <p className="text-sm text-muted-foreground">
                                For complete terms and conditions, please read
                                our{" "}
                                <Link
                                    to="/terms"
                                    className="text-primary hover:underline"
                                >
                                    full Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link
                                    to="/privacy"
                                    className="text-primary hover:underline"
                                >
                                    Privacy Policy
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </ScrollArea>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    {onAccept && (
                        <Button onClick={onAccept}>Accept & Continue</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TermsModal;
