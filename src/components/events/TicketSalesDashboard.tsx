import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Ticket, TrendingUp, DollarSign, Users, CheckCircle, Percent, BarChart3, Eye
} from "lucide-react";
import {
  ChartContainer, ChartConfig
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend, Tooltip
} from "recharts";
import { TicketPurchaserDialog } from "./TicketPurchaserDialog";

interface TicketSalesDashboardProps {
  eventId: string;
}

interface TicketStats {
  totalSold: number;
  totalRevenue: number;
  completedTickets: number;
  conversionRate: number;
  averageTicketPrice: number;
}

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  ticketsSold: number;
  revenue: number;
  quota: number;
  utilizationRate: number;
}

interface PaymentTimeline {
  date: string;
  tickets: number;
  revenue: number;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))",
  "hsl(var(--muted))", "hsl(var(--chart-1))", "hsl(var(--chart-2))",
  "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

const chartConfig = {
  tickets: { label: "Tickets", color: "hsl(var(--primary))" },
  revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export function TicketSalesDashboard({ eventId }: TicketSalesDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats>({
    totalSold: 0,
    totalRevenue: 0,
    completedTickets: 0,
    conversionRate: 0,
    averageTicketPrice: 0,
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [timeline, setTimeline] = useState<PaymentTimeline[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [isPurchaserDialogOpen, setIsPurchaserDialogOpen] = useState(false);

  useEffect(() => {
    fetchTicketSalesData();
  }, [eventId]);

  const fetchTicketSalesData = async () => {
    try {
      setLoading(true);

      // 1️⃣ Ambil event settings
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("admin_fee_amount, admin_fee_enabled, admin_fee_paid_by_customer")
        .eq("id", eventId)
        .single();
      if (eventError) throw eventError;

      // 2️⃣ Ambil semua kategori tiket
      const { data: categories, error: categoriesError } = await supabase
        .from("event_ticket_categories")
        .select("id, name, quota, price")
        .eq("event_id", eventId);

      if (categoriesError) throw categoriesError;

      // 🟢 3️⃣ Ambil transaksi tiket untuk free dan paid sekaligus
      let completedTransactions: any[] = [];

      // Ambil free tickets (harga = 0)
      const { data: freeTickets, error: freeError } = await supabase
        .from("event_tickets")
        .select("id, ticket_category_id, created_at, event_id")
        .eq("event_id", eventId);

      if (freeError) throw freeError;

      // Ambil paid transactions
      const { data: paidTransactions, error: transactionsError } = await supabase
        .from("event_quota_transaction_history")
        .select(`
          ticket_count,
          ticket_category_id,
          created_at,
          payments!inner(status)
        `)
        .eq("transaction_type", "used");

      if (transactionsError) throw transactionsError;

      // Filter paid only for status = paid
      const completedPaidTransactions =
        paidTransactions?.filter((t: any) => t.payments?.status === "paid") || [];

      // Gabungkan dua sumber data (bedakan tipe datanya)
      completedTransactions = [
        ...freeTickets.map((t: any) => ({ ...t, type: "free" })),
        ...completedPaidTransactions.map((t: any) => ({ ...t, type: "paid" })),
      ];

      // 4️⃣ Hitung total tiket terjual & revenue
      const categoryMap = new Map<string, CategoryBreakdown>();

      categories.forEach((cat: any) => {
        const categoryTransactions = completedTransactions.filter(
          (t: any) => t.ticket_category_id === cat.id
        );

        // Bedakan perhitungan berdasarkan jenis transaksi
        const ticketsSold = categoryTransactions.reduce((sum: number, t: any) => {
          if (t.type === "free") return sum + 1;
          if (t.type === "paid") return sum + (t.ticket_count || 0);
          return sum;
        }, 0);

        const revenue = categoryTransactions.reduce((sum: number, t: any) => {
          if (t.type === "paid") {
            return sum + (cat.price || 0) * (t.ticket_count || 0);
          }
          return sum;
        }, 0);

        const quota = cat.quota || 0;
        const utilizationRate = quota > 0 ? (ticketsSold / quota) * 100 : 0;

        categoryMap.set(cat.id, {
          categoryId: cat.id,
          categoryName: cat.name,
          ticketsSold,
          revenue,
          quota,
          utilizationRate,
        });
      });

      const categoryList = Array.from(categoryMap.values());

      // 5️⃣ Hitung total summary
      const totalSold = categoryList.reduce((sum, c) => sum + c.ticketsSold, 0);
      const totalRevenue = categoryList.reduce((sum, c) => sum + c.revenue, 0);
      const completedTickets = totalSold;
      const averageTicketPrice =
        completedTickets > 0 ? totalRevenue / completedTickets : 0;
      const conversionRate =
        totalSold > 0 ? (completedTickets / totalSold) * 100 : 0;

      setStats({
        totalSold,
        totalRevenue,
        completedTickets,
        conversionRate,
        averageTicketPrice,
      });

      setCategoryBreakdown(categoryList);

      // 6️⃣ Timeline untuk grafik
      const timelineMap = new Map<string, PaymentTimeline>();

      completedTransactions.forEach((t: any) => {
        const cat = categories.find((c: any) => c.id === t.ticket_category_id);
        const date = new Date(t.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        const existing = timelineMap.get(date) || { date, tickets: 0, revenue: 0 };
        timelineMap.set(date, {
          date,
          tickets:
            existing.tickets + (t.type === "free" ? 1 : t.ticket_count || 0),
          revenue:
            existing.revenue +
            (t.type === "paid"
              ? (cat?.price || 0) * (t.ticket_count || 0)
              : 0),
        });
      });

      setTimeline(Array.from(timelineMap.values()).slice(-10));
    } catch (error) {
      console.error("Error fetching ticket sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(categoryBreakdown.length / itemsPerPage);
  const paginatedData = categoryBreakdown.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewPurchasers = (categoryId: string, categoryName: string) => {
    setSelectedCategory({ id: categoryId, name: categoryName });
    setIsPurchaserDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pieChartData = categoryBreakdown.map((cat) => ({
    name: cat.categoryName,
    value: cat.ticketsSold,
  }));

  return (
    <div className="space-y-6">
      {/* 🟢 Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              Total Tickets Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSold}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.completedTickets} Completed
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Net Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              Rp {stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on category prices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Avg. Ticket Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              Rp {Math.round(stats.averageTicketPrice).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Per ticket sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Completed vs Total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🟢 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {timeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sales Timeline
              </CardTitle>
              <CardDescription>Ticket sales over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="tickets"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Tickets"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {pieChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Category Distribution
              </CardTitle>
              <CardDescription>Tickets sold by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) =>
                      percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                    }
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 🟢 Category Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Category Breakdown</CardTitle>
          <CardDescription>Detailed sales information by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Tickets Sold</TableHead>
                <TableHead className="text-right">Quota</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryBreakdown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No ticket sales data available
                  </TableCell>
                </TableRow>
              ) : (
                categoryBreakdown.map((category, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{category.categoryName}</TableCell>
                    <TableCell className="text-right font-semibold">{category.ticketsSold}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {category.quota || "Unlimited"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-full max-w-[100px] bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(category.utilizationRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium min-w-[45px]">
                          {category.utilizationRate.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      Rp {category.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPurchasers(category.categoryId, category.categoryName)}
                        disabled={category.ticketsSold === 0}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {categoryBreakdown.length > itemsPerPage && (
            <div className="flex justify-end mt-4 gap-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCategory && (
        <TicketPurchaserDialog
          open={isPurchaserDialogOpen}
          onOpenChange={setIsPurchaserDialogOpen}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          eventId={eventId}
        />
      )}
    </div>
  );
}
