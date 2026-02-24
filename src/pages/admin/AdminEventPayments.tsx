import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface EventPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  user_email: string;
  event_title: string;
  payment_method: string;
  midtrans_order_id: string;
  ticket_count: number;
  created_at: string;
  paid_at: string;
  code: string | null;
  original_amount: number | null;
}

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  pendingPayments: number;
}

const AdminEventPayments = () => {
  const [allPayments, setAllPayments] = useState<EventPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const { data: paymentsData, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          currency,
          status,
          payment_method,
          midtrans_order_id,
          ticket_count,
          created_at,
          paid_at,
          original_amount,
          user_id,
          event_id,
          discount_code_id
        `)
        .eq("payment_type", "lesson")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching event payments:", error);
        toast.error("Failed to fetch event payments: " + error.message);
        return;
      }

      // Fetch related data (users, events, discount codes)
      const userIds = [...new Set(paymentsData?.map((p) => p.user_id))];
      const eventIds = [...new Set(paymentsData?.map((p) => p.event_id))];
      const discountCodeIds = paymentsData
        ?.filter((p) => p.discount_code_id)
        .map((p) => p.discount_code_id) || [];

      const [usersData, eventsData, discountCodesData] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds),
        supabase.from("events").select("id, title").in("id", eventIds),
        discountCodeIds.length > 0
          ? supabase
              .from("discount_codes")
              .select("id, code")
              .in("id", discountCodeIds)
          : { data: [], error: null },
      ]);

      const userMap = new Map(
        usersData.data?.map((u) => [u.user_id, u.email]) || []
      );
      const eventMap = new Map(
        eventsData.data?.map((e) => [e.id, e.title]) || []
      );
      const discountCodeMap = new Map(
        discountCodesData.data?.map((d) => [d.id, d.code]) || []
      );

      const transformedPayments: EventPayment[] = (paymentsData || []).map(
        (payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency || "IDR",
          status: payment.status,
          user_email: userMap.get(payment.user_id) || "Unknown",
          event_title: eventMap.get(payment.event_id) || "N/A",
          payment_method: payment.payment_method || "snap",
          midtrans_order_id: payment.midtrans_order_id || "",
          ticket_count: payment.ticket_count || 1,
          created_at: payment.created_at,
          paid_at: payment.paid_at,
          code: payment.discount_code_id
            ? discountCodeMap.get(payment.discount_code_id) || null
            : null,
          original_amount: payment.original_amount
            ? Number(payment.original_amount)
            : null,
        })
      );

      setAllPayments(transformedPayments);
    } catch (error) {
      console.error("Error fetching event payments:", error);
      toast.error("Failed to fetch event payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredPayments = allPayments.filter((payment) => {
    const matchesSearch =
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.event_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.midtrans_order_id
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats: PaymentStats = {
    totalRevenue: filteredPayments.reduce(
      (sum, p) => (p.status === "paid" ? sum + p.amount : sum),
      0
    ),
    totalTransactions: filteredPayments.length,
    successfulPayments: filteredPayments.filter((p) => p.status === "paid")
      .length,
    pendingPayments: filteredPayments.filter((p) => p.status === "pending")
      .length,
  };

  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleExport = () => {
    toast.info("Preparing data for export...");

    const dataToExport = filteredPayments.map((p) => ({
      "User Email": p.user_email,
      Event: p.event_title,
      "Ticket Count": p.ticket_count,
      Status: p.status,
      "Original Amount": p.original_amount ?? p.amount,
      "Promo Code": p.code || "-",
      "Final Amount": p.amount,
      "Payment Method": p.payment_method,
      "Order ID": p.midtrans_order_id,
      "Created At": formatDate(p.created_at),
      "Paid At": p.paid_at ? formatDate(p.paid_at) : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Event Payments");

    const fileName = `event-payments-export-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success("Export successful!");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      paid: "default",
      pending: "secondary",
      failed: "destructive",
      cancelled: "outline",
      expired: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency || "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading event payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Event Payments</h1>
          <p className="text-muted-foreground">
            Monitor and manage event ticket payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button onClick={fetchPayments} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue, "IDR")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.successfulPayments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingPayments}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Event Payment Transactions</CardTitle>
          <CardDescription>
            View and manage all event ticket payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by email, event, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Promo Code</TableHead>
                  <TableHead>Final Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      No event payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.user_email || "N/A"}
                      </TableCell>
                      <TableCell>{payment.event_title || "N/A"}</TableCell>
                      <TableCell>{payment.ticket_count}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {payment.original_amount &&
                        payment.original_amount !== payment.amount
                          ? formatCurrency(
                              payment.original_amount,
                              payment.currency
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {payment.code ? (
                          <Badge variant="outline">{payment.code}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.midtrans_order_id || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(payment.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.paid_at ? formatDate(payment.paid_at) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
                {totalItems} payments
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEventPayments;
