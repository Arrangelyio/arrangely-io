import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, CreditCard, Building2, AlertCircle, 
  CheckCircle, Clock, DollarSign, Calculator 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WithdrawEarningsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableAmount: string;
  totalEarnings: string;
  creatorId: string;
}

const WithdrawEarningsModal = ({ 
  open, 
  onOpenChange, 
  availableAmount, 
  totalEarnings,
  creatorId 
}: WithdrawEarningsModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({
    amount: "",
    method: "",
    // Bank details
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    // E-wallet details
    walletType: "",
    walletNumber: "",
    walletHolder: ""
  });

  const steps = [
    { id: 1, title: "Amount & Method", icon: DollarSign },
    { id: 2, title: "Payment Details", icon: CreditCard },
    { id: 3, title: "Review & Confirm", icon: CheckCircle }
  ];

  const withdrawalMethods = [
    { id: "bank", name: "Bank Transfer", fee: "Rp2.500", processing: "1-2 business days", icon: Building2 },
    { id: "gopay", name: "GoPay", fee: "Rp1.500", processing: "Instant", icon: Wallet },
    { id: "ovo", name: "OVO", fee: "Rp1.500", processing: "Instant", icon: Wallet },
    { id: "dana", name: "DANA", fee: "Rp1.500", processing: "Instant", icon: Wallet }
  ];

  const banks = [
    "Bank Central Asia (BCA)", "Bank Mandiri", "Bank Negara Indonesia (BNI)",
    "Bank Rakyat Indonesia (BRI)", "Bank CIMB Niaga", "Bank Danamon",
    "Bank Permata", "Bank Maybank", "Bank OCBC NISP", "Jenius"
  ];

  const availableAmountNum = parseInt(availableAmount.replace(/[^\d]/g, ''));
  const minWithdrawal = 50000; // Rp50.000 minimum

  const calculateFee = () => {
    const method = withdrawalMethods.find(m => m.id === withdrawalData.method);
    return method ? parseInt(method.fee.replace(/[^\d]/g, '')) : 0;
  };

  const calculateNet = () => {
    const amount = parseInt(withdrawalData.amount || "0");
    const fee = calculateFee();
    return amount - fee;
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const amount = parseInt(withdrawalData.amount);
      const fee = calculateFee();
      const netAmount = calculateNet();
      
      // Prepare payment details based on method
      let paymentDetails;
      if (withdrawalData.method === 'bank') {
        paymentDetails = {
          bankName: withdrawalData.bankName,
          accountNumber: withdrawalData.accountNumber,
          accountHolderName: withdrawalData.accountHolder
        };
      } else {
        paymentDetails = {
          phoneNumber: withdrawalData.walletNumber,
          accountHolderName: withdrawalData.walletHolder
        };
      }
      
      const { error } = await supabase.functions.invoke('send-withdrawal-request', {
        body: {
          creatorId,
          amount,
          method: withdrawalData.method,
          paymentDetails,
          fee,
          netAmount
        }
      });

      if (error) {
        throw error;
      }

      toast.success("Withdrawal request sent successfully! Admin will process your request soon.");
      onOpenChange(false);
      
      // Reset form
      setCurrentStep(1);
      setWithdrawalData({
        amount: "",
        method: "",
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        walletType: "",
        walletNumber: "",
        walletHolder: ""
      });
      
    } catch (error: any) {
      console.error('Error submitting withdrawal request:', error);
      toast.error(error.message || "Failed to submit withdrawal request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidAmount = () => {
    const amount = parseInt(withdrawalData.amount || "0");
    return amount >= minWithdrawal && amount <= availableAmountNum;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available to Withdraw</p>
                      <p className="text-2xl font-bold text-green-600">{availableAmount}</p>
                    </div>
                    <Wallet className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Earnings</p>
                      <p className="text-2xl font-bold">{totalEarnings}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawal-amount">Withdrawal Amount (Rp)</Label>
                <Input
                  id="withdrawal-amount"
                  type="number"
                  value={withdrawalData.amount}
                  onChange={(e) => setWithdrawalData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder={`Min: Rp${minWithdrawal.toLocaleString()}`}
                  min={minWithdrawal}
                  max={availableAmountNum}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Minimum: Rp{minWithdrawal.toLocaleString()}</span>
                  <span>Maximum: {availableAmount}</span>
                </div>
                {withdrawalData.amount && !isValidAmount() && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Amount must be between Rp{minWithdrawal.toLocaleString()} and {availableAmount}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-3">
                <Label>Select Withdrawal Method</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {withdrawalMethods.map((method) => (
                    <Card 
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        withdrawalData.method === method.id 
                          ? "ring-2 ring-primary bg-primary/5" 
                          : "hover:shadow-md"
                      }`}
                      onClick={() => setWithdrawalData(prev => ({ ...prev, method: method.id }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <method.icon className="h-8 w-8 text-primary" />
                          <div className="flex-1">
                            <h4 className="font-medium">{method.name}</h4>
                            <p className="text-xs text-muted-foreground">Fee: {method.fee}</p>
                            <p className="text-xs text-muted-foreground">{method.processing}</p>
                          </div>
                          {withdrawalData.method === method.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {withdrawalData.amount && withdrawalData.method && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-4 w-4" />
                      <span className="font-medium">Withdrawal Summary</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Withdrawal Amount:</span>
                        <span>Rp{parseInt(withdrawalData.amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Processing Fee:</span>
                        <span>-Rp{calculateFee().toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>You'll Receive:</span>
                        <span className="text-green-600">Rp{calculateNet().toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {withdrawalData.method === "bank" ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Bank Transfer Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Select value={withdrawalData.bankName} onValueChange={(value) => 
                    setWithdrawalData(prev => ({ ...prev, bankName: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-number">Account Number</Label>
                  <Input
                    id="account-number"
                    value={withdrawalData.accountNumber}
                    onChange={(e) => setWithdrawalData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Enter your account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-holder">Account Holder Name</Label>
                  <Input
                    id="account-holder"
                    value={withdrawalData.accountHolder}
                    onChange={(e) => setWithdrawalData(prev => ({ ...prev, accountHolder: e.target.value }))}
                    placeholder="Name as shown on bank account"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">E-Wallet Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="wallet-number">Phone Number / E-Wallet ID</Label>
                  <Input
                    id="wallet-number"
                    value={withdrawalData.walletNumber}
                    onChange={(e) => setWithdrawalData(prev => ({ ...prev, walletNumber: e.target.value }))}
                    placeholder="Enter phone number or wallet ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet-holder">Account Holder Name</Label>
                  <Input
                    id="wallet-holder"
                    value={withdrawalData.walletHolder}
                    onChange={(e) => setWithdrawalData(prev => ({ ...prev, walletHolder: e.target.value }))}
                    placeholder="Name registered to the e-wallet"
                  />
                </div>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please ensure all details are correct. Incorrect information may delay your withdrawal 
                or result in failed transfers.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 3:
        const selectedMethod = withdrawalMethods.find(m => m.id === withdrawalData.method);
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Withdrawal Request</h3>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Withdrawal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-medium">Rp{parseInt(withdrawalData.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Method</Label>
                    <p className="font-medium">{selectedMethod?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Processing Fee</Label>
                    <p className="font-medium">Rp{calculateFee().toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Processing Time</Label>
                    <p className="font-medium">{selectedMethod?.processing}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">You'll Receive:</span>
                  <span className="text-2xl font-bold text-green-600">
                    Rp{calculateNet().toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {withdrawalData.method === "bank" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span>{withdrawalData.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span>{withdrawalData.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Holder:</span>
                      <span>{withdrawalData.accountHolder}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-Wallet:</span>
                      <span>{selectedMethod?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone/ID:</span>
                      <span>{withdrawalData.walletNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Holder Name:</span>
                      <span>{withdrawalData.walletHolder}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your withdrawal request will be processed within {selectedMethod?.processing.toLowerCase()}. 
                You'll receive an email confirmation once the transfer is completed.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Withdraw Earnings
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= step.id 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground text-muted-foreground"
              }`}>
                <step.icon className="h-4 w-4" />
              </div>
              <span className={`ml-2 text-sm ${
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-px mx-4 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button 
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (!withdrawalData.amount || !withdrawalData.method || !isValidAmount())) ||
                  (currentStep === 2 && withdrawalData.method === "bank" && (!withdrawalData.bankName || !withdrawalData.accountNumber || !withdrawalData.accountHolder)) ||
                  (currentStep === 2 && withdrawalData.method !== "bank" && (!withdrawalData.walletNumber || !withdrawalData.walletHolder))
                }
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-gradient-worship hover:opacity-90"
              >
                {isSubmitting ? "Submitting..." : "Confirm Withdrawal"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawEarningsModal;