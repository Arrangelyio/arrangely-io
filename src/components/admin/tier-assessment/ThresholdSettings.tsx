import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Music, BookOpen, Disc, Mic, PenTool, Save } from "lucide-react";

const CATEGORIES = [
  { id: "instrument", name: "Instrumen", icon: Music },
  { id: "theory", name: "Teori Musik", icon: BookOpen },
  { id: "production", name: "Produksi", icon: Disc },
  { id: "songwriting", name: "Songwriting", icon: PenTool },
  { id: "worship_leader", name: "Worship Leader", icon: Mic }
];

const INSTRUMENTS = [
  { value: "guitar", label: "Guitar" },
  { value: "bass", label: "Bass" },
  { value: "piano", label: "Piano" },
  { value: "drum", label: "Drum" },
  { value: "vocals", label: "Vocals" },
  { value: "saxophone", label: "Saxophone" }
];

interface Threshold {
  id: string;
  category: string;
  sub_category: string;
  instrument: string | null;
  pass_threshold: number;
}

export function ThresholdSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingThresholds, setEditingThresholds] = useState<Record<string, number>>({});

  const { data: thresholds, isLoading } = useQuery({
    queryKey: ["tier-assessment-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_assessment_thresholds")
        .select("*")
        .eq("is_production", true)
        .order("category", { ascending: true });
      
      if (error) throw error;
      return data as Threshold[];
    }
  });

  const updateThresholdMutation = useMutation({
    mutationFn: async ({ id, threshold }: { id: string; threshold: number }) => {
      const { error } = await supabase
        .from("tier_assessment_thresholds")
        .update({ 
          pass_threshold: threshold,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tier-assessment-thresholds"] });
      toast({ 
        title: "Threshold updated successfully",
        description: "The passing threshold has been updated."
      });
      setEditingThresholds({});
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error updating threshold", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleThresholdChange = (id: string, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setEditingThresholds(prev => ({ ...prev, [id]: numValue }));
    }
  };

  const handleSave = (id: string, originalThreshold: number) => {
    const newThreshold = editingThresholds[id];
    if (newThreshold !== undefined && newThreshold !== originalThreshold) {
      updateThresholdMutation.mutate({ id, threshold: newThreshold });
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    const Icon = cat?.icon || Music;
    return <Icon className="h-4 w-4" />;
  };

  const getDisplayName = (threshold: Threshold) => {
    const category = CATEGORIES.find(c => c.id === threshold.category);
    const categoryName = category?.name || threshold.category;
    
    if (threshold.category === "instrument" && threshold.instrument) {
      const instrument = INSTRUMENTS.find(i => i.value === threshold.instrument);
      return `${categoryName} - ${instrument?.label || threshold.instrument}`;
    }
    
    return categoryName;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading thresholds...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passing Threshold Settings</CardTitle>
        <CardDescription>
          Configure the minimum passing percentage for each instrument and category. 
          For example, setting 70% means users must answer at least 70% of questions correctly to advance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Category / Instrument</TableHead>
              <TableHead className="w-[200px]">Passing Threshold (%)</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {thresholds?.map((threshold) => {
              const isEditing = editingThresholds[threshold.id] !== undefined;
              const currentValue = isEditing 
                ? editingThresholds[threshold.id] 
                : threshold.pass_threshold;

              return (
                <TableRow key={threshold.id}>
                  <TableCell>
                    {getCategoryIcon(threshold.category)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getDisplayName(threshold)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={currentValue}
                        onChange={(e) => handleThresholdChange(threshold.id, e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={isEditing ? "default" : "outline"}
                      onClick={() => handleSave(threshold.id, threshold.pass_threshold)}
                      disabled={!isEditing || updateThresholdMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
