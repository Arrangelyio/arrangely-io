import { useState } from "react";
import { Crown, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import UpgradeModal from "./UpgradeModal";
import PurchaseModal from "./PurchaseModal";
import PremiumBadge from "./PremiumBadge";

interface PremiumContentOverlayProps {
  children: React.ReactNode;
  isPremium: boolean;
  hasAccess?: boolean;
  arrangement?: {
    title: string;
    artist: string;
    creator: string;
    price: string;
    description?: string;
    key: string;
    tempo: string;
    duration: string;
    preview: string[];
  };
  className?: string;
  showPreview?: boolean;
}

const PremiumContentOverlay = ({ 
  children, 
  isPremium, 
  hasAccess = false, 
  arrangement,
  className,
  showPreview = false
}: PremiumContentOverlayProps) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // If not premium content or user has access, show content normally
  if (!isPremium || hasAccess) {
    return <div className={className}>{children}</div>;
  }

  // Show blurred premium content with overlay
  return (
    <>
      <Card className={cn("relative overflow-hidden", className)}>
        {/* Blurred content */}
        <div className="filter blur-sm pointer-events-none">
          {showPreview ? children : (
            <div className="h-64 bg-muted/30 flex items-center justify-center">
              <Lock className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Premium overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent flex items-center justify-center">
          <Card className="max-w-sm bg-background/95 backdrop-blur-sm shadow-worship">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                  <Crown className="h-8 w-8 text-accent" />
                </div>
                <PremiumBadge className="mb-2" />
                <h3 className="font-semibold text-lg mb-2">Premium Content</h3>
                <p className="text-muted-foreground text-sm">
                  This arrangement requires premium access to view and download.
                </p>
              </div>

              <div className="space-y-3">
                {arrangement && (
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Buy for {arrangement.price}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>

                <p className="text-xs text-muted-foreground">
                  Premium subscribers get unlimited access
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Card>

      {/* Modals */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="premium arrangements"
      />

      {arrangement && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          arrangement={arrangement}
          onPurchase={() => {
            // Handle successful purchase
            
          }}
        />
      )}
    </>
  );
};

export default PremiumContentOverlay;