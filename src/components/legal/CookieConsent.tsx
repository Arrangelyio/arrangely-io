import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { X, Cookie } from "lucide-react";

const CookieConsent = () => {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const hasConsented = localStorage.getItem("arrangely-cookie-consent");
        if (!hasConsented) {
            setShowBanner(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("arrangely-cookie-consent", "accepted");
        setShowBanner(false);
    };

    const handleDecline = () => {
        localStorage.setItem("arrangely-cookie-consent", "declined");
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-[140px] left-4 right-4 z-[90] md:bottom-4 md:left-auto md:right-4 md:max-w-md">
            <Card className="shadow-lg border-primary/20 bg-background">
                <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                        <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                            <div>
                                <h3 className="font-semibold text-sm">
                                    Cookie Consent
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    We use cookies to enhance your experience
                                    and analyze site usage.
                                    <Link
                                        to="/privacy"
                                        className="text-primary hover:underline ml-1"
                                    >
                                        Learn more
                                    </Link>
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    size="sm"
                                    onClick={handleAccept}
                                    className="text-xs"
                                >
                                    Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDecline}
                                    className="text-xs"
                                >
                                    Decline
                                </Button>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDecline}
                            className="p-1 h-auto"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CookieConsent;
