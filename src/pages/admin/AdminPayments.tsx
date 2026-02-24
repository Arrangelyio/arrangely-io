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
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  user_email: string;
  plan_name: string;
  payment_method: string;
  midtrans_order_id: string;
  midtrans_transaction_id: string;
  subscription_status: string;
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

const AdminPayments = () => {
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const { data: paymentsData, error } = await supabase.rpc(
        "get_admin_payments_data"
      );

      if (error) {
        console.error("Error fetching payments:", error);
        toast.error("Failed to fetch payments: " + error.message);
        return;
      }

      const transformedPayments: Payment[] = (paymentsData || []).map(
        (payment) => ({
          id: payment.id,
          amount: Number(payment.amount), // pastikan number
          currency: payment.currency,
          status: payment.status,
          user_email: payment.user_email || "Unknown",
          plan_name: payment.plan_name || "N/A",
          payment_method: payment.payment_method || "snap",
          midtrans_order_id: payment.midtrans_order_id || "",
          midtrans_transaction_id: payment.midtrans_transaction_id || "",
          subscription_status: payment.subscription_status || "unknown",
          created_at: payment.created_at,
          paid_at: payment.paid_at,
          code: payment.code || null,
          original_amount: payment.original_amount
            ? Number(payment.original_amount)
            : null,
        })
      );

      setAllPayments(transformedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Filter + unique by midtrans_order_id
  const filteredPayments = Array.from(
    new Map(
      allPayments
        .filter((payment) => {
          const matchesSearch =
            payment.user_email
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            payment.plan_name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            payment.midtrans_order_id
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase());

          const matchesStatus =
            statusFilter === "all" || payment.status === statusFilter;

          const matchesType = !payment.midtrans_order_id.startsWith("EVT-");

          return matchesSearch && matchesStatus && matchesType;
        })
        .map((p) => [p.midtrans_order_id, p])
    ).values()
  );

  // Stats berdasarkan filteredPayments
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

  // Pagination
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
      Plan: p.plan_name,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");

    const fileName = `payments-export-${
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
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage payment transactions
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
            <CreditCard className="h-4 w-4 text-muted-foreground" />
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>
            View and manage all payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by email, plan, or order ID..."
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
              </SelectContent>
            </Select>
          </div>

          {/* Payments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Original Amount</TableHead>
                  <TableHead>Promo Code</TableHead>
                  <TableHead>Final Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.user_email || "N/A"}
                      </TableCell>
                      <TableCell>{payment.plan_name || "N/A"}</TableCell>
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
                      <TableCell className="capitalize">
                        {payment.payment_method || "snap"}
                      </TableCell>
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

export default AdminPayments;
