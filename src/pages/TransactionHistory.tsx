import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Download, 
  FileText, 
  Calendar, 
  Filter,
  Music,
  Package,
  Video,
  CheckCircle,
  XCircle,
  RotateCcw,
  Gift,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CreditCard,
  Smartphone,
  Banknote
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

const TransactionHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [expandedTransaction, setExpandedTransaction] = useState<number | null>(null);

  // Mock transaction data
  const transactions = [
    {
      id: "TXN-001",
      orderId: "ORD-2024-001",
      date: "2024-01-20",
      items: [
        {
          id: 1,
          type: "arrangement",
          title: "10,000 Reasons (Modern Style)",
          artist: "Matt Redman",
          creator: "Sarah Johnson",
          creatorAvatar: "/placeholder.svg",
          price: 15000
        }
      ],
      subtotal: 15000,
      discount: 0,
      total: 15000,
      paymentMethod: "qris",
      status: "paid",
      refundable: true,
      invoiceUrl: "/invoice-001.pdf"
    },
    {
      id: "TXN-002", 
      orderId: "ORD-2024-002",
      date: "2024-01-18",
      items: [
        {
          id: 2,
          type: "video",
          title: "Advanced Worship Piano Techniques",
          creator: "Michael Chen",
          creatorAvatar: "/placeholder.svg",
          price: 89000
        },
        {
          id: 3,
          type: "arrangement",
          title: "Goodness of God",
          creator: "Sarah Johnson", 
          creatorAvatar: "/placeholder.svg",
          price: 12000
        }
      ],
      subtotal: 101000,
      discount: 10100,
      total: 90900,
      paymentMethod: "gopay",
      status: "paid",
      refundable: false,
      promoCode: "WORSHIP10",
      invoiceUrl: "/invoice-002.pdf"
    },
    {
      id: "TXN-003",
      orderId: "ORD-2024-003", 
      date: "2024-01-15",
      items: [
        {
          id: 4,
          type: "bundle",
          title: "Ultimate Worship Collection",
          creator: "David Kim",
          creatorAvatar: "/placeholder.svg",
          price: 149000,
          originalPrice: 299000
        }
      ],
      subtotal: 149000,
      discount: 0,
      total: 149000,
      paymentMethod: "bank-transfer",
      status: "paid",
      refundable: true,
      giftFrom: "John Martinez",
      invoiceUrl: "/invoice-003.pdf"
    },
    {
      id: "TXN-004",
      orderId: "ORD-2024-004",
      date: "2024-01-10",
      items: [
        {
          id: 5,
          type: "arrangement", 
          title: "How Great Thou Art",
          artist: "Carl Boberg",
          creator: "Emma Wilson",
          creatorAvatar: "/placeholder.svg",
          price: 12000
        }
      ],
      subtotal: 12000,
      discount: 0,
      total: 12000,
      paymentMethod: "credit-card",
      status: "refunded",
      refundAmount: 12000,
      refundDate: "2024-01-12",
      refundReason: "Customer request",
      invoiceUrl: "/invoice-004.pdf"
    },
    {
      id: "TXN-005",
      orderId: "ORD-2024-005",
      date: "2024-01-05",
      items: [
        {
          id: 6,
          type: "video",
          title: "Beginner Guitar for Worship",
          creator: "Lisa Garcia",
          creatorAvatar: "/placeholder.svg", 
          price: 59000
        }
      ],
      subtotal: 59000,
      discount: 0,
      total: 59000,
      paymentMethod: "shopeepay",
      status: "expired",
      expiryDate: "2024-01-15",
      invoiceUrl: "/invoice-005.pdf"
    }
  ];

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.items.some(item => 
                           item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.creator.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      
      switch (dateFilter) {
        case "week":
          matchesDate = transactionDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          matchesDate = transactionDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          matchesDate = transactionDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "refunded":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "refunded":
        return <RotateCcw className="h-4 w-4" />;
      case "expired":
        return <XCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "qris":
      case "gopay":
      case "shopeepay":
        return <Smartphone className="h-4 w-4" />;
      case "bank-transfer":
        return <Banknote className="h-4 w-4" />;
      case "credit-card":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "bundle":
        return <Package className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      "qris": "QRIS",
      "gopay": "GoPay",
      "shopeepay": "ShopeePay",
      "bank-transfer": "Bank Transfer",
      "credit-card": "Credit Card"
    };
    return methods[method] || method;
  };

  const toggleExpanded = (transactionId: number) => {
    setExpandedTransaction(expandedTransaction === transactionId ? null : transactionId);
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
            <p className="text-muted-foreground">
              View and manage all your purchases and invoices
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, item name, or creator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Try adjusting your search or filters" : "You haven't made any purchases yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTransactions.map((transaction) => (
                <Card key={transaction.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Transaction Header */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => toggleExpanded(parseInt(transaction.id.split('-')[1]))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <div>
                              <div className="font-medium">{transaction.orderId}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric"
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(transaction.status)} flex items-center gap-1`}>
                              {getStatusIcon(transaction.status)}
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </Badge>
                            
                            {transaction.giftFrom && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Gift className="h-3 w-3" />
                                Gift
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-primary">
                              Rp{transaction.total.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatPaymentMethod(transaction.paymentMethod)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                            {expandedTransaction === parseInt(transaction.id.split('-')[1]) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items preview */}
                      <div className="mt-3 text-sm text-muted-foreground">
                        {transaction.items.length === 1 ? (
                          <span>{transaction.items[0].title}</span>
                        ) : (
                          <span>{transaction.items.length} items</span>
                        )}
                        {transaction.giftFrom && (
                          <span className="ml-2">• Gift from {transaction.giftFrom}</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedTransaction === parseInt(transaction.id.split('-')[1]) && (
                      <div className="border-t bg-muted/10 p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Items Details */}
                          <div className="lg:col-span-2">
                            <h4 className="font-medium mb-3">Items Purchased</h4>
                            <div className="space-y-3">
                              {transaction.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                  <div className="w-12 h-12 bg-gradient-worship rounded flex items-center justify-center flex-shrink-0">
                                    {getItemIcon(item.type)}
                                  </div>
                                  
                                  <div className="flex-1">
                                    <h5 className="font-medium">{item.title}</h5>
                                    {item.artist && (
                                      <p className="text-sm text-muted-foreground">{item.artist}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      <Avatar className="w-4 h-4">
                                        <AvatarImage src={item.creatorAvatar} />
                                        <AvatarFallback>{item.creator[0]}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm text-muted-foreground">{item.creator}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className="font-medium">Rp{item.price.toLocaleString()}</span>
                                    {item.originalPrice && (
                                      <p className="text-sm text-muted-foreground line-through">
                                        Rp{item.originalPrice.toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Transaction Details */}
                          <div>
                            <h4 className="font-medium mb-3">Transaction Details</h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span>Rp{transaction.subtotal.toLocaleString()}</span>
                              </div>
                              
                              {transaction.discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Discount {transaction.promoCode && `(${transaction.promoCode})`}:</span>
                                  <span>-Rp{transaction.discount.toLocaleString()}</span>
                                </div>
                              )}
                              
                              <div className="flex justify-between font-medium border-t pt-2">
                                <span>Total Paid:</span>
                                <span>Rp{transaction.total.toLocaleString()}</span>
                              </div>

                              {transaction.status === "refunded" && (
                                <div className="bg-blue-50 p-3 rounded-lg mt-3">
                                  <div className="flex justify-between text-sm">
                                    <span>Refund Amount:</span>
                                    <span className="font-medium">Rp{transaction.refundAmount?.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Refund Date:</span>
                                    <span>{transaction.refundDate}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Reason: {transaction.refundReason}
                                  </div>
                                </div>
                              )}

                              {transaction.status === "expired" && (
                                <div className="bg-red-50 p-3 rounded-lg mt-3">
                                  <div className="text-sm text-red-800">
                                    Content access expired on {transaction.expiryDate}
                                  </div>
                                  <Button size="sm" variant="outline" className="mt-2 w-full">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Renew Access
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="space-y-2 mt-6">
                              <Button variant="outline" size="sm" className="w-full">
                                <Download className="h-3 w-3 mr-2" />
                                Download Invoice
                              </Button>
                              
                              {transaction.refundable && transaction.status === "paid" && (
                                <Button variant="outline" size="sm" className="w-full">
                                  <RotateCcw className="h-3 w-3 mr-2" />
                                  Request Refund
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Load More */}
          {filteredTransactions.length > 0 && (
            <div className="text-center mt-8">
              <Button variant="outline">
                Load More Transactions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;