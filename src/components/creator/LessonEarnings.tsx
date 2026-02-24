import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Interface sesuai output RPC
interface RpcEarningData {
  lesson_id: string;
  lesson_title: string;
  transaction_date: string;
  buyer_name: string;
  total_amount: number;
  benefit_percentage: number;
  creator_net_amount: number;
  platform_fee_amount: number;
  status: string;
}

interface GroupedLessonEarning {
  lesson_title: string;
  total_sales: number;
  gross_revenue: number;
  platform_fee: number;
  net_earnings: number;
  benefit_percentage: number;
}

interface LessonEarningsProps {
  creatorId: string;
}

const LessonEarnings = ({ creatorId }: LessonEarningsProps) => {
  const [loading, setLoading] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);

  // State untuk Data
  const [rawTransactions, setRawTransactions] = useState<RpcEarningData[]>([]);
  const [groupedEarnings, setGroupedEarnings] = useState<
    GroupedLessonEarning[]
  >([]);

  const [summary, setSummary] = useState({
    totalNet: 0,
    totalPlatform: 0,
    totalSales: 0,
    monthlyNet: 0,
    avgBenefit: 0, // Untuk display persentase
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchEarnings();
  }, [creatorId]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);

      // 1. PANGGIL RPC
      const { data, error } = await supabase.rpc(
        "get_creator_lesson_earnings_breakdown",
        {
          target_creator_id: creatorId,
        }
      );

      if (error) throw error;

      if (data) {
        const transactions = data as RpcEarningData[];
        setRawTransactions(transactions); // Simpan untuk Transaction History

        // 2. HITUNG SUMMARY (Cards)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let currentBenefit = 70; // Default visual

        const stats = transactions.reduce(
          (acc, curr) => {
            acc.totalNet += curr.creator_net_amount;
            acc.totalPlatform += curr.platform_fee_amount;
            acc.totalSales += 1;

            // Ambil persentase dari transaksi terakhir untuk visualisasi
            currentBenefit = curr.benefit_percentage;

            // Cek bulan ini
            const transDate = new Date(curr.transaction_date);
            if (transDate >= firstDayOfMonth) {
              acc.monthlyNet += curr.creator_net_amount;
            }
            return acc;
          },
          { totalNet: 0, totalPlatform: 0, totalSales: 0, monthlyNet: 0 }
        );

        setSummary({
          ...stats,
          avgBenefit: currentBenefit,
        });

        // 3. GROUPING DATA (Untuk Tabel Earnings by Lesson)
        const groupedMap = new Map<string, GroupedLessonEarning>();

        transactions.forEach((t) => {
          const existing = groupedMap.get(t.lesson_title);
          if (existing) {
            existing.total_sales += 1;
            existing.gross_revenue += t.total_amount;
            existing.platform_fee += t.platform_fee_amount;
            existing.net_earnings += t.creator_net_amount;
          } else {
            groupedMap.set(t.lesson_title, {
              lesson_title: t.lesson_title,
              total_sales: 1,
              gross_revenue: t.total_amount,
              platform_fee: t.platform_fee_amount,
              net_earnings: t.creator_net_amount,
              benefit_percentage: t.benefit_percentage,
            });
          }
        });

        setGroupedEarnings(Array.from(groupedMap.values()));
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load earnings data",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportCSV = () => {
    const headers = [
      "Music Lab",
      "Sales",
      "Gross Revenue",
      "Platform Fee",
      "Net Earnings",
    ];
    const rows = groupedEarnings.map((earning) => [
      earning.lesson_title,
      earning.total_sales,
      earning.gross_revenue,
      earning.platform_fee,
      earning.net_earnings,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lesson-earnings-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Loading Earnings...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Earnings (Net)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(summary.totalNet)}
            </div>
            <p className="text-xs text-muted-foreground">
              ~{summary.avgBenefit}% creator share
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {/* FIX: Gunakan summary.monthlyNet, bukan variable lama */}
              {formatCurrency(summary.monthlyNet)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalSales} total sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* FIX: Gunakan summary.totalPlatform */}
              {formatCurrency(summary.totalPlatform)}
            </div>
            <p className="text-xs text-muted-foreground">
              ~{100 - summary.avgBenefit}% service fee
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings by Lesson Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Earnings by Music Lab</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groupedEarnings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No music lab sales yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Music Lab</TableHead>
                  <TableHead className="text-center">Sales</TableHead>
                  <TableHead className="text-right">Gross Revenue</TableHead>
                  <TableHead className="text-right">Platform Fee</TableHead>
                  <TableHead className="text-right">Net Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedEarnings.map((earning, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {earning.lesson_title}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {earning.total_sales} sales
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(earning.gross_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(earning.platform_fee)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(earning.net_earnings)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTransactions(!showTransactions)}
            >
              {showTransactions ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showTransactions && (
          <CardContent>
            {rawTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No transactions yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Music Lab</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Your Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawTransactions.map((transaction, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {new Date(
                          transaction.transaction_date
                        ).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>{transaction.lesson_title}</TableCell>
                      <TableCell>{transaction.buyer_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.total_amount)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(transaction.creator_net_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default LessonEarnings;
