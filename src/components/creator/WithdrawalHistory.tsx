import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Clock, XCircle } from "lucide-react";

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: string;
  payment_details: any;
  fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
}

interface WithdrawalHistoryProps {
  creatorId: string;
}

const WithdrawalHistory = ({ creatorId }: WithdrawalHistoryProps) => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_withdrawal_requests')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_production', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch withdrawal history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPaymentDetails = (details: any, method: string) => {
    switch (method) {
      case 'bank':
        return `${details.bankName} - ${details.accountNumber}`;
      case 'gopay':
      case 'ovo':
      case 'dana':
        return `${method.toUpperCase()} - ${details.phoneNumber}`;
      default:
        return 'N/A';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    if (creatorId) {
      fetchWithdrawals();
    }
  }, [creatorId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal History</CardTitle>
      </CardHeader>
      <CardContent>
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No withdrawal requests found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Payment Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Processed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>IDR {withdrawal.amount.toLocaleString()}</TableCell>
                  <TableCell>IDR {withdrawal.fee.toLocaleString()}</TableCell>
                  <TableCell className="font-medium">IDR {withdrawal.net_amount.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{withdrawal.method}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {formatPaymentDetails(withdrawal.payment_details, withdrawal.method)}
                  </TableCell>
                  <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                  <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {withdrawal.processed_at 
                      ? new Date(withdrawal.processed_at).toLocaleDateString()
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalHistory;