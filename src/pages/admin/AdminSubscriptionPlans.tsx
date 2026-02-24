import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval_type: string;
  interval_count: number;
  library_limit: number | null;
  features: Record<string, any> | null;
  is_active: boolean;
  is_production: boolean;
  created_at: string;
  updated_at: string;
}

interface EditingState {
  [key: string]: SubscriptionPlan;
}

const AdminSubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlans, setEditingPlans] = useState<EditingState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_production', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subscription plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlans(prev => ({
      ...prev,
      [plan.id]: { ...plan }
    }));
  };

  const handleCancel = (planId: string) => {
    setEditingPlans(prev => {
      const newState = { ...prev };
      delete newState[planId];
      return newState;
    });
  };

  const handleSave = async (planId: string) => {
    const editedPlan = editingPlans[planId];
    if (!editedPlan) return;

    setSaving(planId);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: editedPlan.name,
          price: editedPlan.price,
          currency: editedPlan.currency,
          interval_type: editedPlan.interval_type,
          interval_count: editedPlan.interval_count,
          library_limit: editedPlan.library_limit,
          features: editedPlan.features,
          is_active: editedPlan.is_active
        })
        .eq('id', planId);

      if (error) throw error;

      // Update local state
      setPlans(prev => prev.map(plan => 
        plan.id === planId ? editedPlan : plan
      ));

      // Clear editing state
      handleCancel(planId);

      toast({
        title: "Success",
        description: "Subscription plan updated successfully"
      });
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription plan",
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const handleInputChange = (planId: string, field: keyof SubscriptionPlan, value: any) => {
    setEditingPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading subscription plans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Manage existing subscription plans. Only editing is allowed.
        </p>
      </div>

      <div className="grid gap-6">
        {plans.map((plan) => {
          const isEditing = editingPlans[plan.id];
          const currentPlan = isEditing || plan;

          return (
            <Card key={plan.id} className="relative">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Label htmlFor={`name-${plan.id}`}>Plan Name</Label>
                        <Input
                          id={`name-${plan.id}`}
                          value={currentPlan.name}
                          onChange={(e) => handleInputChange(plan.id, 'name', e.target.value)}
                          className="text-2xl font-bold h-auto py-2"
                        />
                      </div>
                    ) : (
                      <CardTitle className="text-2xl">{currentPlan.name}</CardTitle>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={currentPlan.is_active ? "default" : "secondary"}>
                        {currentPlan.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        {currentPlan.interval_type}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(plan.id)}
                          disabled={saving === plan.id}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(plan.id)}
                          disabled={saving === plan.id}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving === plan.id ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor={`price-${plan.id}`}>Price</Label>
                    {isEditing ? (
                      <Input
                        id={`price-${plan.id}`}
                        type="number"
                        value={currentPlan.price}
                        onChange={(e) => handleInputChange(plan.id, 'price', parseInt(e.target.value) || 0)}
                      />
                    ) : (
                      <div className="text-lg font-semibold">
                        {formatCurrency(currentPlan.price, currentPlan.currency)}
                      </div>
                    )}
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label htmlFor={`currency-${plan.id}`}>Currency</Label>
                    {isEditing ? (
                      <Input
                        id={`currency-${plan.id}`}
                        value={currentPlan.currency}
                        onChange={(e) => handleInputChange(plan.id, 'currency', e.target.value)}
                      />
                    ) : (
                      <div className="text-lg">{currentPlan.currency}</div>
                    )}
                  </div>

                  {/* Interval Type */}
                  <div className="space-y-2">
                    <Label htmlFor={`interval-${plan.id}`}>Billing Interval</Label>
                    {isEditing ? (
                      <Input
                        id={`interval-${plan.id}`}
                        value={currentPlan.interval_type}
                        onChange={(e) => handleInputChange(plan.id, 'interval_type', e.target.value)}
                      />
                    ) : (
                      <div className="text-lg capitalize">{currentPlan.interval_type}</div>
                    )}
                  </div>

                  {/* Interval Count */}
                  <div className="space-y-2">
                    <Label htmlFor={`interval-count-${plan.id}`}>Interval Count</Label>
                    {isEditing ? (
                      <Input
                        id={`interval-count-${plan.id}`}
                        type="number"
                        value={currentPlan.interval_count}
                        onChange={(e) => handleInputChange(plan.id, 'interval_count', parseInt(e.target.value) || 1)}
                      />
                    ) : (
                      <div className="text-lg">{currentPlan.interval_count}</div>
                    )}
                  </div>

                  {/* Library Limit */}
                  {/* <div className="space-y-2">
                    <Label htmlFor={`library-limit-${plan.id}`}>Library Limit</Label>
                    {isEditing ? (
                      <Input
                        id={`library-limit-${plan.id}`}
                        type="number"
                        value={currentPlan.library_limit || ''}
                        onChange={(e) => handleInputChange(plan.id, 'library_limit', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Unlimited if empty"
                      />
                    ) : (
                      <div className="text-lg">{currentPlan.library_limit || 'Unlimited'}</div>
                    )}
                  </div> */}

                  {/* Active Status */}
                  <div className="space-y-2">
                    <Label htmlFor={`active-${plan.id}`}>Active Status</Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`active-${plan.id}`}
                          checked={currentPlan.is_active}
                          onCheckedChange={(checked) => handleInputChange(plan.id, 'is_active', checked)}
                        />
                        <Label htmlFor={`active-${plan.id}`}>
                          {currentPlan.is_active ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    ) : (
                      <div className="text-lg">{currentPlan.is_active ? 'Active' : 'Inactive'}</div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Features */}
<div className="space-y-4">
  <Label>Features</Label>
  {isEditing ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(currentPlan.features || {}).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`${plan.id}-feature-${key}`} className="capitalize">
            {key.replace(/_/g, " ")}
          </Label>
          {typeof value === "boolean" ? (
            <div className="flex items-center space-x-2">
              <Switch
                id={`${plan.id}-feature-${key}`}
                checked={value}
                onCheckedChange={(checked) => {
                  handleInputChange(plan.id, "features", {
                    ...currentPlan.features,
                    [key]: checked,
                  });
                }}
              />
              <span>{value ? "Enabled" : "Disabled"}</span>
            </div>
          ) : (
            <Input
              id={`${plan.id}-feature-${key}`}
              type="text"
              value={value ?? ""}
              onChange={(e) => {
                let newVal: any = e.target.value;
                if (typeof value === "number") {
                  newVal = parseInt(newVal) || null; // null kalau kosong
                } else if (e.target.value === "") {
                  newVal = null; // kosong → null → unlimited
                }
                handleInputChange(plan.id, "features", {
                  ...currentPlan.features,
                  [key]: newVal,
                });
              }}
              placeholder="set 'unlimited' for unlimited"
            />
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(currentPlan.features || {}).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <p className="font-medium capitalize">{key.replace(/_/g, " ")}</p>
          <p className="text-sm text-muted-foreground">
            {value === null || value === "" ? "Unlimited" : String(value)}
          </p>
        </div>
      ))}
    </div>
  )}
</div>



                {/* Metadata */}
                <div className="text-sm text-muted-foreground">
                  <div>Created: {new Date(currentPlan.created_at).toLocaleDateString()}</div>
                  <div>Updated: {new Date(currentPlan.updated_at).toLocaleDateString()}</div>
                  <div>ID: {currentPlan.id}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No subscription plans found.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSubscriptionPlans;