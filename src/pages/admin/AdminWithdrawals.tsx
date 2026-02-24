import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Clock, XCircle } from "lucide-react";

interface WithdrawalRequest {
  id: string;
  creator_id: string;
  amount: number;
  method: string;
  payment_details: any;
  fee: number;
  net_amount: number;
  status: string;
  created_at: string;
  creator_name: string;
  creator_email: string;
}

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('creator_withdrawal_requests')
        .select(`
          *,
          profiles!creator_withdrawal_requests_creator_id_fkey(display_name, user_id)
        `)
        .eq('is_production', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails from auth.users
      const userIds = data?.map(w => w.creator_id) || [];
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      
      const withdrawalsWithDetails = data?.map(withdrawal => ({
        ...withdrawal,
        creator_name: withdrawal.profiles?.display_name || 'Unknown',
        creator_email: authUsers.users.find(u => u.id === withdrawal.creator_id)?.email || 'Unknown'
      })) || [];

      setWithdrawals(withdrawalsWithDetails);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch withdrawal requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      const withdrawal = withdrawals.find(w => w.id === id);
      if (!withdrawal) throw new Error('Withdrawal not found');

      const { error } = await supabase
        .from('creator_withdrawal_requests')
        .update({ 
          status: newStatus,
          processed_at: newStatus === 'paid' ? new Date().toISOString() : null,
          processed_by: newStatus === 'paid' ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', id);

      if (error) throw error;

      // Send email notification if marked as paid
      if (newStatus === 'paid') {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-withdrawal-paid-notification', {
            body: {
              withdrawal_id: id,
              creator_id: withdrawal.creator_id,
              amount: withdrawal.amount,
              method: withdrawal.method
            }
          });

          if (emailError) {
            console.error('Error sending email notification:', emailError);
            toast({
              title: "Warning",
              description: "Withdrawal marked as paid but email notification failed",
              variant: "destructive",
            });
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }

      toast({
        title: "Success",
        description: `Withdrawal request marked as ${newStatus}`,
      });

      fetchWithdrawals();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update withdrawal status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatPaymentDetails = (details: any, method: string) => {
    switch (method) {
      case 'bank':
        return `${details.bankName} - ${details.accountNumber} (${details.accountHolderName})`;
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
    fetchWithdrawals();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Withdrawal Requests</h1>
        <Button onClick={fetchWithdrawals} variant="outline">
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Payment Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{withdrawal.creator_name}</div>
                      <div className="text-sm text-muted-foreground">{withdrawal.creator_email}</div>
                    </div>
                  </TableCell>
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
                    <div className="flex gap-2">
                      {withdrawal.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(withdrawal.id, 'paid')}
                            disabled={updatingStatus === withdrawal.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {updatingStatus === withdrawal.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Mark Paid'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatus(withdrawal.id, 'rejected')}
                            disabled={updatingStatus === withdrawal.id}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {withdrawals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawal requests found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWithdrawals;