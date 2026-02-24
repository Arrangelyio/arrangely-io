import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Select from "react-select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Plus, Edit } from "lucide-react";

interface LessonBenefitConfig {
  id: string;
  creator_id: string;
  benefit_lesson_percentage: number;
  is_active: boolean;
  creator_name: string;
  creator_email: string;
}

interface Creator {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
}

const AdminLessonBenefits = () => {
  const [configs, setConfigs] = useState<LessonBenefitConfig[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LessonBenefitConfig | null>(null);
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
  const [lessonPercentage, setLessonPercentage] = useState<string>("70");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch creators
      const { data: creatorsData } = await supabase
        .from("profiles")
        .select("user_id, display_name, role")
        .eq("is_production", true)
        .in("role", ["creator", "admin"]);

      // Get emails from auth.users
      const creatorsWithEmails = await Promise.all(
        (creatorsData || []).map(async (creator) => {
          const { data: userData } = await supabase.auth.admin.getUserById(creator.user_id);
          return {
            ...creator,
            email: userData?.user?.email || "No email",
          };
        })
      );

      setCreators(creatorsWithEmails);

      // Fetch benefit configurations with creator info
      const { data: configsData } = await supabase
        .from("creator_benefit_configs")
        .select(`
          id,
          creator_id,
          benefit_lesson_percentage,
          is_active
        `)
        .eq("is_production", true)
        .order("created_at", { ascending: false });

      if (configsData) {
        const configsWithCreatorInfo = configsData.map((config) => {
          const creator = creatorsWithEmails.find((c) => c.user_id === config.creator_id);
          return {
            ...config,
            creator_name: creator?.display_name || "Unknown",
            creator_email: creator?.email || "Unknown",
          };
        });
        setConfigs(configsWithCreatorInfo);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch lesson benefit configurations",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!selectedCreatorIds.length) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select at least one creator",
        });
        return;
      }

      const percentage = parseInt(lessonPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Lesson percentage must be between 0 and 100",
        });
        return;
      }

      if (editingConfig) {
        // Update existing config
        const { error } = await supabase
          .from("creator_benefit_configs")
          .update({
            benefit_lesson_percentage: percentage,
          })
          .eq("id", editingConfig.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Lesson benefit configuration updated successfully",
        });
      } else {
        // Insert or update for multiple creators
        for (const creatorId of selectedCreatorIds) {
          const { error: upsertError } = await supabase
            .from("creator_benefit_configs")
            .upsert(
              {
                creator_id: creatorId,
                benefit_lesson_percentage: percentage,
                is_active: true,
                is_production: true,
              },
              {
                onConflict: "creator_id",
              }
            );

          if (upsertError) throw upsertError;
        }

        toast({
          title: "Success",
          description: `Lesson benefit configured for ${selectedCreatorIds.length} creator(s)`,
        });
      }

      setDialogOpen(false);
      setEditingConfig(null);
      setSelectedCreatorIds([]);
      setLessonPercentage("70");
      fetchData();
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save lesson benefit configuration",
      });
    }
  };

  const handleEdit = (config: LessonBenefitConfig) => {
    setEditingConfig(config);
    setLessonPercentage(config.benefit_lesson_percentage.toString());
    setSelectedCreatorIds([config.creator_id]);
    setDialogOpen(true);
  };

  const handleToggleActive = async (configId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("creator_benefit_configs")
        .update({ is_active: !currentStatus })
        .eq("id", configId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Configuration ${!currentStatus ? "activated" : "deactivated"}`,
      });

      fetchData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update configuration status",
      });
    }
  };

  const creatorOptions = creators.map((creator) => ({
    value: creator.user_id,
    label: `${creator.display_name} (${creator.email})`,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Lesson Benefit Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure the revenue share percentage for lesson creators
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingConfig(null);
              setLessonPercentage("70");
              setSelectedCreatorIds([]);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Configure Benefits
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit" : "Configure"} Lesson Benefits
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Creator(s)</Label>
                <Select
                  isMulti={!editingConfig}
                  isDisabled={!!editingConfig}
                  options={creatorOptions}
                  value={creatorOptions.filter((opt) =>
                    selectedCreatorIds.includes(opt.value)
                  )}
                  onChange={(selected) => {
                    if (Array.isArray(selected)) {
                      setSelectedCreatorIds(selected.map((s) => s.value));
                    } else if (selected && 'value' in selected) {
                      setSelectedCreatorIds([selected.value]);
                    } else {
                      setSelectedCreatorIds([]);
                    }
                  }}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>

              <div className="space-y-2">
                <Label>Lesson Revenue Share (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={lessonPercentage}
                  onChange={(e) => setLessonPercentage(e.target.value)}
                  placeholder="e.g., 70 (creator gets 70%, platform gets 30%)"
                />
                <p className="text-sm text-muted-foreground">
                  Percentage of lesson revenue that goes to the creator
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingConfig ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Benefit Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No lesson benefit configurations yet. Click "Configure Benefits" to add one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Lesson Revenue Share</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      {config.creator_name}
                    </TableCell>
                    <TableCell>{config.creator_email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {config.benefit_lesson_percentage}% (Platform: {100 - config.benefit_lesson_percentage}%)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={config.is_active ? "default" : "secondary"}
                      >
                        {config.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={config.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() =>
                            handleToggleActive(config.id, config.is_active)
                          }
                        >
                          {config.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLessonBenefits;
