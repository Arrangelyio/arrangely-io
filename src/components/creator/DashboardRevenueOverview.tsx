import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Music,
  GraduationCap,
  Music2,
  DollarSign,
  CalendarIcon,
  TrendingUp,
  Percent,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface ArrangementBreakdown {
  songPublished: number;
  addToLibrary: number;
  discountCode: number;
}

interface RevenueData {
  arrangementGross: number;
  arrangementNet: number;
  arrangementBreakdown: ArrangementBreakdown;
  musicLabGross: number;
  musicLabNet: number;
  sequencerGross: number;
  sequencerNet: number;
  totalGross: number;
  totalNet: number;
}

interface DashboardRevenueOverviewProps {
  creatorId: string;
  isAdmin?: boolean;
  selectedCreatorType?: string;
  filteredCreatorIds?: string[];
  isAdminWithoutSelection?: boolean;
}

type PeriodPreset = "all" | "this_month" | "last_month" | "last_3_months" | "custom";

const DashboardRevenueOverview = ({ 
  creatorId,
  isAdmin = false,
  selectedCreatorType = "all",
  filteredCreatorIds = [],
  isAdminWithoutSelection = false
}: DashboardRevenueOverviewProps) => {
  const [loading, setLoading] = useState(true);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [revenueData, setRevenueData] = useState<RevenueData>({
    arrangementGross: 0,
    arrangementNet: 0,
    arrangementBreakdown: {
      songPublished: 0,
      addToLibrary: 0,
      discountCode: 0,
    },
    musicLabGross: 0,
    musicLabNet: 0,
    sequencerGross: 0,
    sequencerNet: 0,
    totalGross: 0,
    totalNet: 0,
  });

  // Calculate date range based on preset
  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    switch (periodPreset) {
      case "this_month":
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      case "last_3_months":
        return {
          from: startOfMonth(subMonths(now, 2)),
          to: endOfMonth(now),
        };
      case "custom":
        return dateRange;
      case "all":
      default:
        return undefined;
    }
  }, [periodPreset, dateRange]);

  useEffect(() => {
    if (creatorId) {
      fetchRevenueData();
    }
  }, [creatorId, effectiveDateRange]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);

      const fromDate = effectiveDateRange?.from?.toISOString();
      const toDate = effectiveDateRange?.to?.toISOString();

      // 1. Fetch arrangement earnings from creator_benefits
      let arrangementQuery = supabase
        .from("creator_benefits")
        .select("amount, benefit_type, created_at")
        .eq("creator_id", creatorId)
        .eq("is_production", true);

      if (fromDate) arrangementQuery = arrangementQuery.gte("created_at", fromDate);
      if (toDate) arrangementQuery = arrangementQuery.lte("created_at", toDate);

      const { data: arrangementData } = await arrangementQuery;

      // Calculate arrangement earnings by benefit type
      // Benefits: song_publish, library_add, discount_code
      const arrangementBreakdown: ArrangementBreakdown = {
        songPublished: 0,
        addToLibrary: 0,
        discountCode: 0,
      };

      arrangementData?.forEach((item) => {
        const amount = item.amount || 0;
        switch (item.benefit_type) {
          case "song_publish":
            arrangementBreakdown.songPublished += amount;
            break;
          case "library_add":
            arrangementBreakdown.addToLibrary += amount;
            break;
          case "discount_code":
            arrangementBreakdown.discountCode += amount;
            break;
        }
      });

      // For arrangement songs, the amount in creator_benefits IS the gross (no platform fee)
      const arrangementGross = arrangementData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      // Platform fee is 0 for arrangement songs, so net = gross
      const arrangementNet = arrangementGross;

      // 2. Fetch Music Lab (lesson) earnings
      const { data: lessonData } = await supabase.rpc(
        "get_creator_lesson_earnings_breakdown",
        { target_creator_id: creatorId }
      );

      let musicLabGross = 0;
      let musicLabNet = 0;

      if (lessonData) {
        const filteredLessons = lessonData.filter((item: any) => {
          if (!fromDate && !toDate) return true;
          const itemDate = new Date(item.transaction_date);
          if (fromDate && itemDate < new Date(fromDate)) return false;
          if (toDate && itemDate > new Date(toDate)) return false;
          return true;
        });

        filteredLessons.forEach((item: any) => {
          musicLabGross += item.total_amount || 0;
          musicLabNet += item.creator_net_amount || 0;
        });
      }

      // 3. Fetch Sequencer earnings
      const { data: sequencerData } = await supabase
        .from("sequencer_enrollments")
        .select(`
          id,
          enrolled_at,
          payment:payments!sequencer_enrollments_payment_id_fkey (
            amount,
            status,
            paid_at
          ),
          sequencer_file:sequencer_files!sequencer_enrollments_sequencer_file_id_fkey (
            song:songs!sequencer_files_song_id_fkey (
              user_id
            )
          )
        `)
        .eq("is_production", true);

      let sequencerGross = 0;
      let sequencerNet = 0;

      if (sequencerData) {
        const creatorEnrollments = sequencerData.filter((enrollment: any) => {
          const songCreatorId = enrollment.sequencer_file?.song?.user_id;
          const paymentStatus = enrollment.payment?.status;
          if (songCreatorId !== creatorId || paymentStatus !== "paid") return false;

          // Apply date filter
          const enrollDate = new Date(enrollment.payment?.paid_at || enrollment.enrolled_at);
          if (fromDate && enrollDate < new Date(fromDate)) return false;
          if (toDate && enrollDate > new Date(toDate)) return false;
          return true;
        });

        creatorEnrollments.forEach((enrollment: any) => {
          const amount = enrollment.payment?.amount || 0;
          sequencerGross += amount;
          sequencerNet += Math.round(amount * 0.7); // 70% creator share
        });
      }

      const totalGross = arrangementGross + musicLabGross + sequencerGross;
      const totalNet = arrangementNet + musicLabNet + sequencerNet;

      setRevenueData({
        arrangementGross,
        arrangementNet,
        arrangementBreakdown,
        musicLabGross,
        musicLabNet,
        sequencerGross,
        sequencerNet,
        totalGross,
        totalNet,
      });
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString("id-ID")}`;
  };

  const calculatePlatformFee = (gross: number, net: number) => {
    return gross - net;
  };

  // Show message when admin has selected a creator type but not a specific creator
  if (isAdminWithoutSelection) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="flex flex-col items-center gap-3">
            <DollarSign className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground text-lg">
              Please select a specific creator to view their revenue data
            </p>
            <p className="text-sm text-muted-foreground/70">
              Use the creator filter above to choose a creator
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Revenue Period
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={periodPreset}
                onValueChange={(val) => setPeriodPreset(val as PeriodPreset)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {periodPreset === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd MMM yyyy")} -{" "}
                            {format(dateRange.to, "dd MMM yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "dd MMM yyyy")
                        )
                      ) : (
                        "Pick date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Revenue Breakdown by Source */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Arrangement Earnings */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Music className="h-4 w-4 text-blue-500" />
              Arrangement Songs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="animate-pulse h-20 bg-muted rounded" />
            ) : (
              <>
                <div className="text-xs text-muted-foreground mb-2 pb-2 border-b border-dashed">
                  Benefits from: Song Published, Add to Library, Discount Code Cashback
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Song Published</span>
                  <span>{formatCurrency(revenueData.arrangementBreakdown.songPublished)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Add to Library</span>
                  <span>{formatCurrency(revenueData.arrangementBreakdown.addToLibrary)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount Code</span>
                  <span>{formatCurrency(revenueData.arrangementBreakdown.discountCode)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Gross Revenue</span>
                  <span className="font-medium">{formatCurrency(revenueData.arrangementGross)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="text-muted-foreground">Rp0</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Net Earnings</span>
                  <span className="text-green-600">{formatCurrency(revenueData.arrangementNet)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Music Lab Earnings */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-500" />
              Music Lab
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="animate-pulse h-16 bg-muted rounded" />
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Revenue</span>
                  <span>{formatCurrency(revenueData.musicLabGross)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee (30%)</span>
                  <span className="text-destructive">
                    -{formatCurrency(calculatePlatformFee(revenueData.musicLabGross, revenueData.musicLabNet))}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Net Earnings</span>
                  <span className="text-green-600">{formatCurrency(revenueData.musicLabNet)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sequencer Earnings */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Music2 className="h-4 w-4 text-orange-500" />
              Sequencer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="animate-pulse h-16 bg-muted rounded" />
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Revenue</span>
                  <span>{formatCurrency(revenueData.sequencerGross)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee (30%)</span>
                  <span className="text-destructive">
                    -{formatCurrency(calculatePlatformFee(revenueData.sequencerGross, revenueData.sequencerNet))}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Net Earnings</span>
                  <span className="text-green-600">{formatCurrency(revenueData.sequencerNet)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Total Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse h-24 bg-muted rounded" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Total Gross Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(revenueData.totalGross)}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Total Platform Fee</p>
                <p className="text-2xl font-bold text-destructive">
                  -{formatCurrency(calculatePlatformFee(revenueData.totalGross, revenueData.totalNet))}
                </p>
              </div>
              {/* <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1 justify-center md:justify-start">
                  Creator Share <Percent className="h-3 w-3" />
                </p>
                <p className="text-2xl font-bold text-primary">70%</p>
              </div> */}
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Total Net Earnings</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(revenueData.totalNet)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardRevenueOverview;
