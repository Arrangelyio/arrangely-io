import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Download,
  Play,
  FileText,
  Library,
  Share2,
  Music,
  Package,
  Video,
  Gift,
  ArrowRight,
  Printer,
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

const PurchaseConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const orderData = location.state || {
    items: [],
    total: 0,
    paymentMethod: "qris",
    orderId: "ORD-DEMO",
  };

  const { items, total, paymentMethod, orderId } = orderData;
  const purchaseDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const relatedItems = [
    {
      id: 101,
      type: "arrangement",
      title: "Goodness of God",
      creator: "Sarah Johnson",
      price: 12000,
      thumbnail: "/placeholder.svg",
    },
    {
      id: 102,
      type: "bundle",
      title: "Contemporary Worship Collection",
      creator: "David Kim",
      price: 149000,
      originalPrice: 220000,
      thumbnail: "/placeholder.svg",
    },
    {
      id: 103,
      type: "video",
      title: "Worship Guitar Masterclass",
      creator: "Alex Thompson",
      price: 79000,
      thumbnail: "/placeholder.svg",
    },
  ];

  const getItemIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "bundle":
        return <Package className="h-5 w-5" />;
      default:
        return <Music className="h-5 w-5" />;
    }
  };

  const getItemActions = (item: any) => {
    switch (item.type) {
      case "video":
        return (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <Play className="h-4 w-4 mr-1" />
              Watch Now
            </Button>
          </div>
        );
      case "bundle":
        return (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <Package className="h-4 w-4 mr-1" />
              View Bundle
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="outline">
              <Play className="h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />

      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground text-lg">
              Thank you for your purchase. Your order has been confirmed.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono font-medium">{orderId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{purchaseDate}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Payment Method:
                    </span>
                    <span className="capitalize">
                      {paymentMethod.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="font-bold text-primary text-lg">
                      Rp{total.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Purchased Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Purchases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-worship rounded flex items-center justify-center flex-shrink-0">
                          {getItemIcon(item.type)}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{item.title}</h3>
                          {item.artist && (
                            <p className="text-sm text-muted-foreground">
                              {item.artist}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            by {item.creator}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {item.type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600 border-green-600"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Purchased
                            </Badge>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium text-primary">
                            Rp{item.price.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {getItemActions(item)}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Access Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Access Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Instant Access</h4>
                      <p className="text-sm text-muted-foreground">
                        All your purchases are now available in your library
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Lifetime Access</h4>
                      <p className="text-sm text-muted-foreground">
                        Access your purchases anytime, anywhere
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Cloud Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Your library syncs across all your devices
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6 space-y-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => navigate("/library")}
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Go to Library
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </Button>

                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Download Invoice
                  </Button>

                  <Button variant="ghost" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Purchase
                  </Button>
                </CardContent>
              </Card>

              {/* Receipt */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Digital Receipt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Items ({items.length})</span>
                    <span>Rp{total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>Included</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>Rp{total.toLocaleString()}</span>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    A copy has been sent to your email
                  </p>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Contact support if you have any issues accessing your
                    purchases
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Related Products */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>You might also like</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedItems.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="w-full aspect-video bg-gradient-worship rounded mb-3 flex items-center justify-center">
                      {getItemIcon(item.type)}
                    </div>

                    <h4 className="font-medium mb-1 line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.creator}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-primary">
                          Rp{item.price.toLocaleString()}
                        </span>
                        {item.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through ml-2">
                            Rp{item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PurchaseConfirmation;
