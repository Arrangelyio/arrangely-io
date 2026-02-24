import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface Reward {
  id: string;
  name: string;
  type: "subscription" | "custom";
  subscriptionPlan?: string;
  quantity: number;
}

interface RewardConfigurationProps {
  onConfigComplete: (rewards: Reward[]) => void;
  disabled: boolean;
  demoMode?: boolean;
}

export default function RewardConfiguration({
  onConfigComplete,
  disabled,
  demoMode = false,
}: RewardConfigurationProps) {
  // Auto-populate with demo rewards if in demo mode
  const getDemoRewards = (): Reward[] => [
    {
      id: "demo-1",
      name: "Premium Monthly Subscription",
      type: "subscription",
      subscriptionPlan: "premium_monthly",
      quantity: 3,
    },
    {
      id: "demo-2",
      name: "Basic Yearly Subscription",
      type: "subscription",
      subscriptionPlan: "basic_yearly",
      quantity: 2,
    },
    {
      id: "demo-3",
      name: "JBL Go 3 Speaker",
      type: "custom",
      quantity: 2,
    },
    {
      id: "demo-4",
      name: "Arrangely T-Shirt",
      type: "custom",
      quantity: 5,
    },
    {
      id: "demo-5",
      name: "Starbucks Voucher",
      type: "custom",
      quantity: 3,
    },
  ];

  const [rewards, setRewards] = useState<Reward[]>(
    demoMode ? getDemoRewards() : []
  );
  // const [rewards, setRewards] = useState<Reward[]>([]);
  const [newReward, setNewReward] = useState({
    name: "",
    type: "subscription" as "subscription" | "custom",
    subscriptionPlan: "",
    quantity: 1,
  });

  useEffect(() => {
    // Jika demoMode berubah SETELAH komponen dimuat
    if (demoMode) {
      // Jika demo diaktifkan, isi dengan data dummy
      setRewards(getDemoRewards());
    } else {
      // Jika demo dinonaktifkan, kosongkan rewards
      setRewards([]);
    }
    // useEffect ini akan dijalankan setiap kali nilai `demoMode` berubah
  }, [demoMode]);

  const subscriptionPlans = [
    { value: "basic_monthly", label: "Basic Plan Monthly" },
    { value: "premium_monthly", label: "Premium Plan Monthly" },
    { value: "basic_yearly", label: "Basic Plan Yearly" },
    { value: "premium_yearly", label: "Premium Plan Yearly" },
  ];

  const presetRewards = [
    "JBL Go 3 Speaker",
    "Arrangely T-Shirt",
    "Starbucks Voucher",
    "Spotify Premium 1 Month",
    "Apple Gift Card $25",
  ];

  const addReward = () => {
    if (!newReward.name || newReward.quantity < 1) return;
    if (newReward.type === "subscription" && !newReward.subscriptionPlan)
      return;

    const reward: Reward = {
      id: Date.now().toString(),
      name: newReward.name,
      type: newReward.type,
      subscriptionPlan:
        newReward.type === "subscription"
          ? newReward.subscriptionPlan
          : undefined,
      quantity: newReward.quantity,
    };

    setRewards((prev) => [...prev, reward]);
    setNewReward({
      name: "",
      type: "subscription",
      subscriptionPlan: "",
      quantity: 1,
    });
  };

  const removeReward = (id: string) => {
    setRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePresetSelect = (rewardName: string) => {
    setNewReward((prev) => ({
      ...prev,
      name: rewardName,
      type: "subscription",
    }));
  };

  const handleCustomReward = () => {
    setNewReward((prev) => ({ ...prev, name: "", type: "custom" }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Rewards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reward Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor="reward-type">Reward Type</Label>
              <Select
                value={newReward.type}
                onValueChange={(value: "subscription" | "custom") =>
                  setNewReward((prev) => ({
                    ...prev,
                    type: value,
                    subscriptionPlan:
                      value === "custom" ? "" : prev.subscriptionPlan,
                  }))
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">
                    Subscription Reward
                  </SelectItem>
                  <SelectItem value="custom">Custom Reward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reward-name">Reward Name</Label>
              <Input
                id="reward-name"
                value={newReward.name}
                onChange={(e) =>
                  setNewReward((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={
                  newReward.type === "custom"
                    ? "Enter custom reward"
                    : "Enter reward name"
                }
                disabled={disabled}
              />
            </div>

            {newReward.type === "subscription" && (
              <div>
                <Label htmlFor="subscription-plan">Target Plan</Label>
                <Select
                  value={newReward.subscriptionPlan}
                  onValueChange={(value) =>
                    setNewReward((prev) => ({
                      ...prev,
                      subscriptionPlan: value,
                    }))
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.value} value={plan.value}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newReward.type === "custom" && (
              <div>
                <Label htmlFor="custom-note">Note</Label>
                <Input
                  id="custom-note"
                  value="Free text reward"
                  disabled
                  className="text-muted-foreground"
                />
              </div>
            )}

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newReward.quantity}
                onChange={(e) =>
                  setNewReward((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
                disabled={disabled}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={addReward}
                disabled={disabled}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reward
              </Button>
            </div>
          </div>

          {/* Current Rewards List */}
          {rewards.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Configured Rewards
              </Label>
              <div className="space-y-2">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{reward.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              reward.type === "subscription"
                                ? "secondary"
                                : "default"
                            }
                            className={`text-xs ${
                              reward.type === "custom"
                                ? "bg-purple-100 text-purple-800"
                                : ""
                            }`}
                          >
                            {reward.type === "subscription"
                              ? subscriptionPlans.find(
                                  (p) => p.value === reward.subscriptionPlan
                                )?.label
                              : "Custom Reward"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Qty: {reward.quantity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReward(reward.id)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rewards.length > 0 && (
            <Button
              onClick={() => onConfigComplete(rewards)}
              className="w-full"
              disabled={disabled}
            >
              Complete Reward Configuration
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
