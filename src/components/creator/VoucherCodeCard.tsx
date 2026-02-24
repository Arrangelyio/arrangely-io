import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  ExternalLink, 
  Share2, 
  Check,
  Calendar,
  Users,
  TrendingUp,
  MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiscountCode {
  id: string;
  code: string;
  discount_value: number;
  discount_type: string;
  max_uses: number | null;
  used_count: number;
  valid_until: string | null;
}

interface VoucherCodeCardProps {
  code: DiscountCode;
  cashbackPercentage?: number;
}

const VoucherCodeCard = ({ code, cashbackPercentage = 10 }: VoucherCodeCardProps) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { toast } = useToast();

  const generateShareableLink = (codeStr: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/pricing?voucher=${encodeURIComponent(codeStr)}`;
  };

  const formatDiscount = (discountCode: DiscountCode) => {
    if (discountCode.discount_type === 'percentage') {
      return `${discountCode.discount_value}% OFF`;
    }
    return `Rp ${discountCode.discount_value.toLocaleString('id-ID')} OFF`;
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isMaxedOut = (discountCode: DiscountCode) => {
    return discountCode.max_uses !== null && discountCode.used_count >= discountCode.max_uses;
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    toast({
      title: "Copied!",
      description: `${type === 'code' ? 'Code' : 'Link'} copied to clipboard`
    });
  };

  const getShareText = () => {
    const discountText = code.discount_type === 'percentage' 
      ? `${code.discount_value}%` 
      : `Rp ${code.discount_value.toLocaleString('id-ID')}`;
    
    return `🎵 Mau belajar musik lebih mudah?\n\nPakai kode diskon aku: ${code.code}\nDapat potongan ${discountText} untuk langganan Arrangely!\n\n✨ Chord & lirik lengkap\n🎸 Transpose mudah\n📚 Library lagu terbesar\n\nDaftar sekarang 👇\n${generateShareableLink(code.code)}`;
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToInstagram = () => {
    // Copy to clipboard for Instagram (can't directly share to IG)
    navigator.clipboard.writeText(getShareText());
    toast({
      title: "Caption Copied!",
      description: "Paste ke Instagram Story atau DM kamu"
    });
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: `Diskon ${formatDiscount(code)} untuk Arrangely`,
        text: getShareText(),
        url: generateShareableLink(code.code)
      });
    } else {
      copyToClipboard(getShareText(), 'link');
    }
  };

  const expired = isExpired(code.valid_until);
  const maxedOut = isMaxedOut(code);
  const isActive = !expired && !maxedOut;
  const usagePercentage = code.max_uses ? (code.used_count / code.max_uses) * 100 : 0;

  // Calculate potential earnings
  const avgSubscriptionValue = 449000; // Average yearly subscription
  const potentialEarningPerUse = (avgSubscriptionValue * cashbackPercentage) / 100;
  const totalEarned = code.used_count * potentialEarningPerUse;

  return (
    <Card className={`overflow-hidden transition-all ${isActive ? 'border-primary/30 shadow-md' : 'opacity-60'}`}>
      <CardContent className="p-0">
        {/* Header with code */}
        <div className={`p-4 ${isActive ? 'bg-gradient-to-r from-primary/10 to-primary/5' : 'bg-muted'}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Badge 
                variant="default"
                className={`text-lg px-4 py-2 font-mono font-bold ${isActive ? 'bg-primary' : 'bg-muted-foreground'}`}
              >
                {code.code}
              </Badge>
              <Badge variant="outline" className="text-primary border-primary font-semibold">
                {formatDiscount(code)}
              </Badge>
              {!isActive && (
                <Badge variant="destructive">
                  {expired ? "Expired" : "Max Uses Reached"}
                </Badge>
              )}
            </div>

            {isActive && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {cashbackPercentage}% Cashback
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="p-4 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Usage Stats */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Penggunaan</span>
              </div>
              <p className="text-xl font-bold">
                {code.used_count}
                <span className="text-sm font-normal text-muted-foreground">
                  {code.max_uses ? ` / ${code.max_uses}` : ''}
                </span>
              </p>
              {code.max_uses && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${usagePercentage > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Validity */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Berlaku sampai</span>
              </div>
              <p className="text-lg font-semibold">
                {code.valid_until 
                  ? new Date(code.valid_until).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })
                  : 'Selamanya'}
              </p>
            </div>

            {/* Potential per use */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Potensi/Pakai</span>
              </div>
              <p className="text-lg font-semibold text-green-600">
                Rp {potentialEarningPerUse.toLocaleString('id-ID')}
              </p>
            </div>

            {/* Total earned */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Estimasi Earned</span>
              </div>
              <p className="text-lg font-semibold text-green-600">
                Rp {totalEarned.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isActive && (
          <div className="p-4 space-y-3">
            {/* Copy buttons row */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                onClick={() => copyToClipboard(code.code, 'code')}
                className="w-full"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => copyToClipboard(generateShareableLink(code.code), 'link')}
                className="w-full"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>

            {/* Share buttons row */}
            {/* <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={shareToWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button 
                onClick={shareToInstagram}
                className="w-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </Button>
              <Button 
                onClick={shareNative}
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div> */}

            {/* Preview text */}
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Preview pesan yang akan dishare:</p>
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                🎵 Mau belajar musik lebih mudah?{'\n\n'}
                Pakai kode diskon aku: <span className="font-bold text-foreground">{code.code}</span>{'\n'}
                Dapat potongan <span className="font-bold text-foreground">{formatDiscount(code)}</span> untuk langganan Arrangely!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Need to import Sparkles
import { Sparkles } from "lucide-react";

export default VoucherCodeCard;
