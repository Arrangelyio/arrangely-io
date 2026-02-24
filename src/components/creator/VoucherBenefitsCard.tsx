import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Sparkles } from "lucide-react";

interface VoucherBenefitsCardProps {
  cashbackPercentage?: number;
}

const VoucherBenefitsCard = ({ cashbackPercentage = 10 }: VoucherBenefitsCardProps) => {
  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-lg">Keuntungan Kode Diskon Kamu</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cashback Benefit */}
          <div className="flex items-start gap-3 p-4 bg-white/60 dark:bg-black/20 rounded-lg">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 mb-1">
                {cashbackPercentage}% Cashback
              </Badge>
              <p className="text-sm text-muted-foreground">
                Setiap kali kode kamu dipakai, kamu dapat <span className="font-semibold text-green-600">{cashbackPercentage}% cashback</span> dari nilai langganan
              </p>
            </div>
          </div>

          {/* User Benefit */}
          <div className="flex items-start gap-3 p-4 bg-white/60 dark:bg-black/20 rounded-lg">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 mb-1">
                Bantu Followers
              </Badge>
              <p className="text-sm text-muted-foreground">
                Followers kamu dapat <span className="font-semibold text-blue-600">potongan harga</span> saat berlangganan
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="flex items-start gap-3 p-4 bg-white/60 dark:bg-black/20 rounded-lg">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 mb-1">
                Mudah Dibagikan
              </Badge>
              <p className="text-sm text-muted-foreground">
                Share langsung ke <span className="font-semibold text-purple-600">Instagram & WhatsApp</span> dengan satu klik
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoucherBenefitsCard;
