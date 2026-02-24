import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Edit, Percent } from "lucide-react";

interface BenefitRule {
  contribution_type: string;
  multiplier: number;
  description: string;
}

const AdminPlatformBenefitRules = () => {
  const [rules, setRules] = useState<BenefitRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BenefitRule | null>(null);

  // State form
  const [multiplier, setMultiplier] = useState<string>("1.0");
  const [description, setDescription] = useState<string>("");

  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_benefit_rules")
        .select("*")
        .order("contribution_type");

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Error fetching rules:", error);
      toast({
        title: "Error",
        description: "Failed to load benefit rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: BenefitRule) => {
    setEditingRule(rule);
    setMultiplier(rule.multiplier.toString());
    setDescription(rule.description || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingRule) return;

    try {
      const numMultiplier = parseFloat(multiplier);
      if (isNaN(numMultiplier) || numMultiplier < 0) {
        toast({
          title: "Invalid Input",
          description: "Multiplier must be a valid positive number",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("platform_benefit_rules")
        .update({
          multiplier: numMultiplier,
          description: description,
        })
        .eq("contribution_type", editingRule.contribution_type);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Benefit rule updated successfully",
      });

      setDialogOpen(false);
      fetchRules();
    } catch (error) {
      console.error("Error updating rule:", error);
      toast({
        title: "Error",
        description: "Failed to update benefit rule",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Benefit Rules</h1>
          <p className="text-muted-foreground">
            Manage global percentage multipliers for creator benefits
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Benefit Multipliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contribution Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Multiplier</TableHead>
                <TableHead>Calculated %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.contribution_type}>
                  <TableCell className="font-medium capitalize">
                    {rule.contribution_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{rule.description}</TableCell>
                  <TableCell>{rule.multiplier}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        rule.multiplier >= 1
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {(rule.multiplier * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Benefit Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Input
                value={editingRule?.contribution_type || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Multiplier (e.g. 1.0 for 100%, 0.5 for 50%)</Label>
              <Input
                type="number"
                step="0.01"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlatformBenefitRules;
