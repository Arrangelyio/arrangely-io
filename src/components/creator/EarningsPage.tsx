import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, Wallet } from "lucide-react";
import WithdrawEarningsModal from "./WithdrawEarningsModal";
import DiscountCodeEarnings from "./DiscountCodeEarnings";
import WithdrawalHistory from "./WithdrawalHistory";

interface EarningsData {
  totalEarnings: string;
  pendingWithdrawal: string;
  thisMonth: string;
  lastWithdrawal: string;
}

interface ArrangementEarning {
  id: number;
  title: string;
  sales: number;
  revenue: string;
  platformFee: string;
  netEarnings: string;
}

interface EarningsPageProps {
  earnings: EarningsData;
  arrangementEarnings: ArrangementEarning[];
  creatorId: string;
}

const EarningsPage = ({ earnings, arrangementEarnings, creatorId }: EarningsPageProps) => {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{earnings.totalEarnings}</div>
            <p className="text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earnings.thisMonth}</div>
            <p className="text-xs text-muted-foreground">+25% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available for Withdrawal</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earnings.pendingWithdrawal}</div>
            <p className="text-xs text-muted-foreground">Ready to withdraw</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Section */}
      {/* <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Withdrawal</CardTitle>
            <Button 
              className="bg-gradient-worship hover:opacity-90"
              onClick={() => setShowWithdrawModal(true)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Withdraw Earnings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Available Amount</p>
              <p className="text-2xl font-bold text-green-600">{earnings.pendingWithdrawal}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Last Withdrawal</p>
              <p className="text-sm text-muted-foreground">{earnings.lastWithdrawal}</p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Earnings by Arrangement</CardTitle>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arrangement</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Gross Revenue</TableHead>
                <TableHead>Platform Fee (30%)</TableHead>
                <TableHead>Net Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrangementEarnings.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.sales} sales</Badge>
                  </TableCell>
                  <TableCell>{item.revenue}</TableCell>
                  <TableCell className="text-red-600">-{item.platformFee}</TableCell>
                  <TableCell className="font-medium text-green-600">{item.netEarnings}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discount Code Earnings */}
      <DiscountCodeEarnings creatorId={creatorId} />

      {/* Withdrawal History */}
      <WithdrawalHistory creatorId={creatorId} />

      <WithdrawEarningsModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        availableAmount={earnings.pendingWithdrawal}
        totalEarnings={earnings.totalEarnings}
        creatorId={creatorId}
      />
    </div>
  );
};

export default EarningsPage;