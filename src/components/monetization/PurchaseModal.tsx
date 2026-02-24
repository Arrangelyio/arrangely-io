import { useState } from "react";
import { ShoppingCart, User, Eye, Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import PremiumBadge from "./PremiumBadge";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  arrangement: {
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
  onPurchase?: () => void;
}

const PurchaseModal = ({ isOpen, onClose, arrangement, onPurchase }: PurchaseModalProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    // Simulate purchase process
    setTimeout(() => {
      setIsPurchasing(false);
      onPurchase?.();
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Arrangement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Arrangement Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{arrangement.title}</h3>
                  <p className="text-muted-foreground">{arrangement.artist}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Key: {arrangement.key}</span>
                    <span>Tempo: {arrangement.tempo}</span>
                    <span>{arrangement.duration}</span>
                  </div>
                </div>
                <PremiumBadge price={arrangement.price} />
              </div>
            </CardHeader>

            <CardContent>
              {/* Creator Info */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-secondary/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${arrangement.creator}`} />
                  <AvatarFallback>{arrangement.creator[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">Created by {arrangement.creator}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      1.2k views
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      89 likes
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      156 downloads
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrangement Preview */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Preview:</h4>
                <div className="bg-muted/50 p-3 rounded border border-dashed">
                  {arrangement.preview.map((line, index) => (
                    <p key={index} className="text-sm font-mono">
                      {index < 2 ? line : "●●●●●●●●●●●●●●●●●"}
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Purchase to view full arrangement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Single Purchase</h4>
                <p className="text-sm text-muted-foreground">One-time access to this arrangement</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{arrangement.price}</p>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-worship hover:opacity-90" 
              onClick={handlePurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? "Processing..." : `Purchase for ${arrangement.price}`}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Secure payment • Instant access • 70% goes to creator
              </p>
              <p className="text-xs text-muted-foreground">
                Already have Premium? <span className="text-primary cursor-pointer hover:underline">Access for free</span>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseModal;