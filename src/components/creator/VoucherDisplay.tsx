import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Ticket, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VoucherBenefitsCard from "./VoucherBenefitsCard";
import VoucherCodeCard from "./VoucherCodeCard";

interface DiscountCode {
  id: string;
  code: string;
  discount_value: number;
  discount_type: string;
  max_uses: number | null;
  used_count: number;
  valid_until: string | null;
}

interface VoucherDisplayProps {
  creatorId: string;
}

const VoucherDisplay = ({ creatorId }: VoucherDisplayProps) => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Default cashback percentage for creators
  const CASHBACK_PERCENTAGE = 10;

  useEffect(() => {
    fetchAssignedCodes();
  }, [creatorId]);

  const fetchAssignedCodes = async () => {
    try {
      // Determine environment based on hostname
      const hostname = typeof window !== "undefined" ? window.location.hostname : "";
      const isProduction = hostname === "arrangely.io" || hostname === "www.arrangely.io";

      const { data, error } = await supabase
        .from("discount_code_assignments")
        .select(`
          discount_codes!inner(
            id,
            code,
            discount_value,
            discount_type,
            max_uses,
            used_count,
            valid_until
          )
        `)
        .eq("creator_id", creatorId)
        .eq("is_production", isProduction);

      if (error) throw error;
      
      const codes = data?.map(assignment => assignment.discount_codes).filter(Boolean) || [];
      setDiscountCodes(codes);
    } catch (error) {
      console.error("Error fetching assigned codes:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch your discount codes"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Kode Diskon Kamu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Benefits Explanation Card */}
      <VoucherBenefitsCard cashbackPercentage={CASHBACK_PERCENTAGE} />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Kode Diskon Kamu
            </CardTitle>
            {discountCodes.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>{discountCodes.length} kode aktif</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {discountCodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Share2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Belum ada kode diskon</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Hubungi admin untuk mendapatkan kode diskon personal kamu. 
                Dengan kode ini, kamu bisa dapat cashback setiap kali ada yang berlangganan!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {discountCodes.map((code) => (
                <VoucherCodeCard 
                  key={code.id} 
                  code={code} 
                  cashbackPercentage={CASHBACK_PERCENTAGE}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      {discountCodes.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Tips Memaksimalkan Penggunaan Kode
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Share kode di <strong>Instagram Story</strong> dengan link swipe-up untuk konversi maksimal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Kirim ke <strong>grup WhatsApp</strong> komunitas musik kamu</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Tambahkan di <strong>bio Instagram/TikTok</strong> kamu</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Mention kode di <strong>video YouTube</strong> saat sharing arrangement</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoucherDisplay;
