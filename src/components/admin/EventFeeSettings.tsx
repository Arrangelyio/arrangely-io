import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventFeeSettingsProps {
  eventId: string;
}

export function EventFeeSettings({ eventId }: EventFeeSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [adminFee, setAdminFee] = useState(5000);
  const [adminFeeEnabled, setAdminFeeEnabled] = useState(true);
  const [adminFeePaidBy, setAdminFeePaidBy] = useState<"customer" | "promoter">("customer");
  
  const [platformFee, setPlatformFee] = useState(3000);
  const [platformFeeEnabled, setPlatformFeeEnabled] = useState(true);
  const [platformFeePaidBy, setPlatformFeePaidBy] = useState<"customer" | "promoter">("customer");
  
  const [vatTax, setVatTax] = useState(11);
  const [vatTaxEnabled, setVatTaxEnabled] = useState(true);
  const [vatTaxPaidBy, setVatTaxPaidBy] = useState<"customer" | "promoter">("customer");

  useEffect(() => {
    fetchFeeSettings();
  }, [eventId]);

  const fetchFeeSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("admin_fee_amount, admin_fee_enabled, admin_fee_paid_by_customer, platform_fee_amount, platform_fee_enabled, platform_fee_paid_by_customer, vat_tax_percentage, vat_tax_enabled, vat_tax_paid_by_customer")
        .eq("id", eventId)
        .single();

      if (error) throw error;

      if (data) {
        setAdminFee(data.admin_fee_amount || 10);
        setAdminFeeEnabled(data.admin_fee_enabled ?? true);
        setAdminFeePaidBy(data.admin_fee_paid_by_customer ? "customer" : "promoter");
        
        setPlatformFee(data.platform_fee_amount || 3000);
        setPlatformFeeEnabled(data.platform_fee_enabled ?? true);
        setPlatformFeePaidBy(data.platform_fee_paid_by_customer ? "customer" : "promoter");
        
        setVatTax(data.vat_tax_percentage || 11);
        setVatTaxEnabled(data.vat_tax_enabled ?? true);
        setVatTaxPaidBy(data.vat_tax_paid_by_customer ? "customer" : "promoter");
      }
    } catch (error: any) {
      toast({
        title: "Error loading fee settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          admin_fee_amount: adminFee,
          admin_fee_enabled: adminFeeEnabled,
          admin_fee_paid_by_customer: adminFeePaidBy === "customer",
          platform_fee_amount: platformFee,
          platform_fee_enabled: platformFeeEnabled,
          platform_fee_paid_by_customer: platformFeePaidBy === "customer",
          vat_tax_percentage: vatTax,
          vat_tax_enabled: vatTaxEnabled,
          vat_tax_paid_by_customer: vatTaxPaidBy === "customer",
        })
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Fee settings saved",
        description: "Event fee configuration has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving fee settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Configuration</CardTitle>
        <CardDescription>
          Configure admin fees, platform fees, and taxes for this event. Choose whether each fee is enabled and who pays it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Admin Fee */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="admin-fee-enabled" className="text-base font-semibold">
                Admin Fee
              </Label>
              <p className="text-sm text-muted-foreground">
                Administrative processing fee per transaction
              </p>
            </div>
            <Switch
              id="admin-fee-enabled"
              checked={adminFeeEnabled}
              onCheckedChange={setAdminFeeEnabled}
            />
          </div>
          
          {adminFeeEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="admin-fee">Percentage (%)</Label>
                <Input
                  id="admin-fee"
                  type="number"
                  value={adminFee}
                  onChange={(e) => setAdminFee(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-fee-paid-by">Paid By</Label>
                <Select value={adminFeePaidBy} onValueChange={(v) => setAdminFeePaidBy(v as any)}>
                  <SelectTrigger id="admin-fee-paid-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="promoter">Promoter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Platform Fee */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="platform-fee-enabled" className="text-base font-semibold">
                Platform Fee
              </Label>
              <p className="text-sm text-muted-foreground">
                Platform service fee per transaction
              </p>
            </div>
            <Switch
              id="platform-fee-enabled"
              checked={platformFeeEnabled}
              onCheckedChange={setPlatformFeeEnabled}
            />
          </div>
          
          {platformFeeEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="platform-fee">Amount (IDR)</Label>
                <Input
                  id="platform-fee"
                  type="number"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform-fee-paid-by">Paid By</Label>
                <Select value={platformFeePaidBy} onValueChange={(v) => setPlatformFeePaidBy(v as any)}>
                  <SelectTrigger id="platform-fee-paid-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="promoter">Promoter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* VAT Tax */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="vat-tax-enabled" className="text-base font-semibold">
                VAT Tax (PPN)
              </Label>
              <p className="text-sm text-muted-foreground">
                Value-added tax percentage
              </p>
            </div>
            <Switch
              id="vat-tax-enabled"
              checked={vatTaxEnabled}
              onCheckedChange={setVatTaxEnabled}
            />
          </div>
          
          {vatTaxEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="vat-tax">Percentage (%)</Label>
                <Input
                  id="vat-tax"
                  type="number"
                  value={vatTax}
                  onChange={(e) => setVatTax(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat-tax-paid-by">Paid By</Label>
                <Select value={vatTaxPaidBy} onValueChange={(v) => setVatTaxPaidBy(v as any)}>
                  <SelectTrigger id="vat-tax-paid-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="promoter">Promoter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Fee Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
