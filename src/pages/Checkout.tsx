import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Gift,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Music,
  Package,
  Video
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState(location.state?.items || []);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("qris");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock cart items if none provided
  const defaultCartItems = [
    {
      id: 1,
      type: "arrangement",
      title: "10,000 Reasons (Modern Style)",
      artist: "Matt Redman",
      creator: "Sarah Johnson",
      price: 15000,
      originalPrice: 25000,
      thumbnail: "/placeholder.svg"
    },
    {
      id: 2,
      type: "video",
      title: "Advanced Worship Piano Techniques",
      creator: "Michael Chen",
      price: 89000,
      duration: "2h 30m",
      thumbnail: "/placeholder.svg"
    }
  ];

  const items = cartItems.length > 0 ? cartItems : defaultCartItems;

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0; // 10% discount
  const total = subtotal - discount;

  const paymentMethods = [
    {
      id: "qris",
      name: "QRIS",
      icon: <Smartphone className="h-5 w-5" />,
      description: "Scan QR code with any e-wallet"
    },
    {
      id: "gopay",
      name: "GoPay",
      icon: <Smartphone className="h-5 w-5 text-green-600" />,
      description: "Pay with GoPay wallet"
    },
    {
      id: "shopeepay",
      name: "ShopeePay",
      icon: <Smartphone className="h-5 w-5 text-orange-500" />,
      description: "Pay with ShopeePay wallet"
    },
    {
      id: "bank-transfer",
      name: "Bank Transfer",
      icon: <Banknote className="h-5 w-5" />,
      description: "Transfer to bank account"
    },
    {
      id: "credit-card",
      name: "Credit/Debit Card",
      icon: <CreditCard className="h-5 w-5" />,
      description: "Visa, Mastercard, JCB"
    }
  ];

  const handleRemoveItem = (itemId: number) => {
    setCartItems(items.filter(item => item.id !== itemId));
  };

  const handleApplyPromo = () => {
    if (promoCode.toLowerCase() === "worship10") {
      setPromoApplied(true);
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      navigate("/purchase-confirmation", { 
        state: { 
          items, 
          total, 
          paymentMethod: selectedPayment,
          orderId: `ORD-${Date.now()}`
        } 
      });
    }, 2000);
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

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Checkout</h1>
              <p className="text-muted-foreground">Complete your purchase</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Your Order ({items.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-gradient-worship rounded flex items-center justify-center flex-shrink-0">
                        {getItemIcon(item.type)}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium">{item.title}</h3>
                        {item.artist && (
                          <p className="text-sm text-muted-foreground">{item.artist}</p>
                        )}
                        <p className="text-sm text-muted-foreground">by {item.creator}</p>
                        {item.duration && (
                          <p className="text-xs text-muted-foreground">{item.duration}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="font-medium text-primary">
                          Rp{item.price.toLocaleString()}
                        </div>
                        {item.originalPrice && (
                          <div className="text-sm text-muted-foreground line-through">
                            Rp{item.originalPrice.toLocaleString()}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Promo Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Promo Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={promoApplied}
                    />
                    <Button 
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={promoApplied || !promoCode}
                    >
                      Apply
                    </Button>
                  </div>
                  {promoApplied && (
                    <div className="flex items-center gap-2 mt-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Promo code applied! 10% discount</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} 
                         className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                           selectedPayment === method.id 
                             ? "border-primary bg-primary/5" 
                             : "hover:border-muted-foreground/50"
                         }`}
                         onClick={() => setSelectedPayment(method.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedPayment === method.id 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedPayment === method.id && (
                            <div className="w-full h-full rounded-full bg-primary-foreground scale-50" />
                          )}
                        </div>
                        {method.icon}
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-muted-foreground">{method.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>Rp{subtotal.toLocaleString()}</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount (10%)</span>
                        <span>-Rp{discount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span className="text-primary">Rp{total.toLocaleString()}</span>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      "Processing..."
                    ) : (
                      `Pay Rp${total.toLocaleString()}`
                    )}
                  </Button>

                  {/* Security Info */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Secure Checkout</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• 256-bit SSL encryption</div>
                      <div>• Money-back guarantee</div>
                      <div>• Instant access after payment</div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="text-xs text-muted-foreground">
                    By completing your purchase, you agree to our Terms of Service and 
                    understand that digital products are non-refundable except as required by law.
                  </div>
                </CardContent>
              </Card>

              {/* Help */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Need Help?</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Contact our support team if you have any questions about your purchase.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;