import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  UserPlus,
  RefreshCw,
  UserX,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CustomerMetrics {
  newCustomers: number;
  renewals: {
    total: number;
    onceRenewed: number;
    twiceRenewed: number;
    threeTimesRenewed: number;
    fourPlusRenewed: number;
  };
  churnedCustomers: number;
  subscriptionsByPlan: Array<{
    plan_name: string;
    billing_cycle: string;
    subscriber_count: number;
    total_revenue: number;
  }>;
}

interface CustomerMetricsSectionProps {
  metrics: CustomerMetrics;
  loading: boolean;
  dateRange?: { from?: Date; to?: Date };
}

type ModalType =
  | "new"
  | "churned"
  | "renewal_1"
  | "renewal_2"
  | "renewal_3"
  | "renewal_4plus"
  | null;

export default function CustomerMetricsSection({
  metrics,
  loading,
  dateRange,
}: CustomerMetricsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = useMemo(
    () => Math.ceil(detailData.length / rowsPerPage),
    [detailData]
  );

  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return detailData.slice(start, end);
  }, [detailData, currentPage]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);

  const fetchDetails = async (type: ModalType) => {
    setLoadingDetail(true);
    setCurrentPage(1);
    try {
      let rpcName = "";
      let params: any = {};

      switch (type) {
        case "new":
          rpcName = "get_new_customers_detail";
          params = {
            start_date: dateRange?.from?.toISOString() || null,
            end_date: dateRange?.to?.toISOString() || null,
          };
          break;

        case "churned":
          rpcName = "get_churned_customers_detail";
          params = {
            start_date: dateRange?.from?.toISOString() || null,
            end_date: dateRange?.to?.toISOString() || null,
          };
          break;

        case "renewal_1":
          rpcName = "get_renewed_customers_detail";
          params = {
            renewal_times: 1,
            start_date: dateRange?.from?.toISOString() || null,
            end_date: dateRange?.to?.toISOString() || null,
          };
          break;

        case "renewal_2":
          rpcName = "get_renewed_customers_detail";
          params = {
            renewal_times: 2,
            start_date: dateRange?.from?.toISOString() || null,
            end_date: dateRange?.to?.toISOString() || null,
          };
          break;

        case "renewal_3":
          rpcName = "get_renewed_customers_detail";
          params = {
            renewal_times: 3,
            start_date: dateRange?.from?.toISOString() || null,
            end_date: dateRange?.to?.toISOString() || null,
          };
          break;

        case "renewal_4plus":
          rpcName = "get_renewed_customers_detail";
          params = {
            renewal_times: 4,
            start_date: dateRange?.from?.toISOString() || null,
            end_date: dateRange?.to?.toISOString() || null,
          };
          break;

        default:
          return;
      }

      const { data, error } = await supabase.rpc(rpcName, params);
      if (error) throw error;

      setDetailData(data?.records || data || []);
      setModalType(type);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error("Failed to fetch details:", err);
      alert("Failed to load details: " + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };


  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const renderModalTitle = () => {
    switch (modalType) {
      case "new":
        return "New Customers Details";
      case "churned":
        return "Churned Customers Details";
      case "renewal_1":
        return "Customers Renewed Once";
      case "renewal_2":
        return "Customers Renewed Twice";
      case "renewal_3":
        return "Customers Renewed 3 Times";
      case "renewal_4plus":
        return "Customers Renewed 4+ Times";
      default:
        return "";
    }
  };

  const renderDateLabel = () => {
    if (modalType === "churned") return "Expired At";
    if (modalType?.startsWith("renewal")) return "Renewed At";
    return "Subscribed At";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Customer Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Customer Metrics</h2>
        <p className="text-muted-foreground">
          Customer acquisition, retention, and subscription details
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* New */}
        <Card
          onClick={() => fetchDetails("new")}
          className="cursor-pointer hover:bg-muted/50 transition"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.newCustomers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">First-time subscribers</p>
          </CardContent>
        </Card>

        {/* Renewals */}
        <Card
          onClick={() => fetchDetails("renewal_1")}
          className="cursor-pointer hover:bg-muted/50 transition"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Renewals</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.renewals.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Customers who renewed
            </p>
          </CardContent>
        </Card>

        {/* Churned */}
        <Card
          onClick={() => fetchDetails("churned")}
          className="cursor-pointer hover:bg-muted/50 transition"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Churned Customers
            </CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.churnedCustomers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Did not renew</p>
          </CardContent>
        </Card>

        {/* Plans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.subscriptionsByPlan.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Different subscription plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Renewal Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> Renewal Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "1x Renewed", count: metrics.renewals.onceRenewed, type: "renewal_1" },
              { label: "2x Renewed", count: metrics.renewals.twiceRenewed, type: "renewal_2" },
              { label: "3x Renewed", count: metrics.renewals.threeTimesRenewed, type: "renewal_3" },
              { label: "4+ Renewed", count: metrics.renewals.fourPlusRenewed, type: "renewal_4plus" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition"
                onClick={() => fetchDetails(item.type as ModalType)}
              >
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{renderModalTitle()}</DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {currentRows.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-right">
                            {renderDateLabel()}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.display_name || "Unknown"}</TableCell>
                            <TableCell>{row.email || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.plan_name}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {new Date(
                                row.renewed_at ||
                                  row.subscribed_at ||
                                  row.expired_at
                              ).toLocaleString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-6">
                  No data available
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
