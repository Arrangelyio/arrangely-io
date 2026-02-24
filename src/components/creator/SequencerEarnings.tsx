import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Music2,
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

interface SequencerTransaction {
  enrollment_id: string;
  sequencer_file_id: string;
  song_title: string;
  buyer_name: string;
  amount: number;
  paid_at: string;
  creator_net_amount: number;
  platform_fee_amount: number;
}

interface GroupedSequencerEarning {
  song_title: string;
  sequencer_file_id: string;
  total_sales: number;
  gross_revenue: number;
  platform_fee: number;
  net_earnings: number;
}

interface SequencerEarningsProps {
  creatorId: string;
}

const CREATOR_SHARE_PERCENTAGE = 70;

const SequencerEarnings = ({ creatorId }: SequencerEarningsProps) => {
  const [loading, setLoading] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);

  const [rawTransactions, setRawTransactions] = useState<SequencerTransaction[]>([]);
  const [groupedEarnings, setGroupedEarnings] = useState<GroupedSequencerEarning[]>([]);

  const [summary, setSummary] = useState({
    totalNet: 0,
    totalPlatform: 0,
    totalSales: 0,
    monthlyNet: 0,
    avgBenefit: CREATOR_SHARE_PERCENTAGE,
  });

  const { toast } = useToast();

  useEffect(() => {
    if (creatorId) {
      fetchEarnings();
    }
  }, [creatorId]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);

      // Fetch sequencer enrollments with payments for the creator's songs
      const { data, error } = await supabase
        .from("sequencer_enrollments")
        .select(`
          id,
          sequencer_file_id,
          user_id,
          enrolled_at,
          payment:payments!sequencer_enrollments_payment_id_fkey (
            amount,
            status,
            paid_at
          ),
          sequencer_file:sequencer_files!sequencer_enrollments_sequencer_file_id_fkey (
            id,
            song:songs!sequencer_files_song_id_fkey (
              id,
              title,
              artist,
              user_id
            )
          )
        `)
        .eq("is_production", true);

      if (error) throw error;

      if (data) {
        // Filter enrollments that belong to the creator's songs and have paid status
        const creatorEnrollments = data.filter((enrollment: any) => {
          const songCreatorId = enrollment.sequencer_file?.song?.user_id;
          const paymentStatus = enrollment.payment?.status;
          return songCreatorId === creatorId && paymentStatus === "paid";
        });

        // Transform to transactions
        const transactions: SequencerTransaction[] = creatorEnrollments.map((enrollment: any) => {
          const amount = enrollment.payment?.amount || 0;
          const platformFee = Math.round(amount * ((100 - CREATOR_SHARE_PERCENTAGE) / 100));
          const netAmount = amount - platformFee;

          return {
            enrollment_id: enrollment.id,
            sequencer_file_id: enrollment.sequencer_file_id,
            song_title: enrollment.sequencer_file?.song?.title || "Unknown",
            buyer_name: "User",
            amount: amount,
            paid_at: enrollment.payment?.paid_at || enrollment.enrolled_at,
            creator_net_amount: netAmount,
            platform_fee_amount: platformFee,
          };
        });

        setRawTransactions(transactions);

        // Calculate summary
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = transactions.reduce(
          (acc, curr) => {
            acc.totalNet += curr.creator_net_amount;
            acc.totalPlatform += curr.platform_fee_amount;
            acc.totalSales += 1;

            const transDate = new Date(curr.paid_at);
            if (transDate >= firstDayOfMonth) {
              acc.monthlyNet += curr.creator_net_amount;
            }
            return acc;
          },
          { totalNet: 0, totalPlatform: 0, totalSales: 0, monthlyNet: 0 }
        );

        setSummary({
          ...stats,
          avgBenefit: CREATOR_SHARE_PERCENTAGE,
        });

        // Grouping by song
        const groupedMap = new Map<string, GroupedSequencerEarning>();

        transactions.forEach((t) => {
          const key = t.sequencer_file_id;
          const existing = groupedMap.get(key);
          if (existing) {
            existing.total_sales += 1;
            existing.gross_revenue += t.amount;
            existing.platform_fee += t.platform_fee_amount;
            existing.net_earnings += t.creator_net_amount;
          } else {
            groupedMap.set(key, {
              song_title: t.song_title,
              sequencer_file_id: t.sequencer_file_id,
              total_sales: 1,
              gross_revenue: t.amount,
              platform_fee: t.platform_fee_amount,
              net_earnings: t.creator_net_amount,
            });
          }
        });

        setGroupedEarnings(Array.from(groupedMap.values()));
      }
    } catch (error) {
      console.error("Error fetching sequencer earnings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load sequencer earnings data",
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
      "Song Title",
      "Sales",
      "Gross Revenue",
      "Platform Fee",
      "Net Earnings",
    ];
    const rows = groupedEarnings.map((earning) => [
      earning.song_title,
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
    a.download = `sequencer-earnings-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Loading Sequencer Earnings...
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
              Total Sequencer Earnings (Net)
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
              {formatCurrency(summary.totalPlatform)}
            </div>
            <p className="text-xs text-muted-foreground">
              ~{100 - summary.avgBenefit}% service fee
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings by Sequencer Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Earnings by Sequencer</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groupedEarnings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sequencer sales yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Song Title</TableHead>
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
                      {earning.song_title}
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
                    <TableHead>Song Title</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Your Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawTransactions.map((transaction, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {new Date(transaction.paid_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>{transaction.song_title}</TableCell>
                      <TableCell>{transaction.buyer_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.amount)}
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

export default SequencerEarnings;
