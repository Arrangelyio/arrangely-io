import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Save,
  Loader2,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface ScoreConfig {
  id: string;
  config_key: string;
  config_value: number;
  description: string | null;
}

interface RejectionWeight {
  id: string;
  rejection_reason: string;
  weight_penalty: number;
  description: string | null;
  is_active: boolean;
}

export default function AdminScoreConfig() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, loading: isLoadingRole } = useUserRole();
  
  const [editedConfigs, setEditedConfigs] = useState<Record<string, number>>({});
  const [editedWeights, setEditedWeights] = useState<Record<string, { penalty: number; active: boolean }>>({});

  useEffect(() => {
    if (!isLoadingRole && role !== 'admin') {
      navigate('/');
      toast.error('Access denied');
    }
  }, [role, isLoadingRole, navigate]);

  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['score-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_pro_score_config')
        .select('*')
        .order('config_key');
      if (error) throw error;
      return data as ScoreConfig[];
    },
    enabled: role === 'admin'
  });

  const { data: weights, isLoading: isLoadingWeights } = useQuery({
    queryKey: ['rejection-weights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rejection_weight_config')
        .select('*')
        .order('weight_penalty', { ascending: false });
      if (error) throw error;
      return data as RejectionWeight[];
    },
    enabled: role === 'admin'
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { error } = await supabase
        .from('creator_pro_score_config')
        .update({ config_value: value, updated_at: new Date().toISOString() })
        .eq('config_key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['score-configs'] });
      toast.success('Configuration updated');
    },
    onError: (error) => {
      toast.error('Failed to update configuration');
      console.error(error);
    }
  });

  const updateWeightMutation = useMutation({
    mutationFn: async ({ id, penalty, active }: { id: string; penalty: number; active: boolean }) => {
      const { error } = await supabase
        .from('rejection_weight_config')
        .update({ weight_penalty: penalty, is_active: active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rejection-weights'] });
      toast.success('Rejection weight updated');
    },
    onError: (error) => {
      toast.error('Failed to update rejection weight');
      console.error(error);
    }
  });

  const handleConfigChange = (key: string, value: number) => {
    setEditedConfigs(prev => ({ ...prev, [key]: value }));
  };

  const handleWeightChange = (id: string, penalty: number, active: boolean) => {
    setEditedWeights(prev => ({ ...prev, [id]: { penalty, active } }));
  };

  const saveConfig = (key: string) => {
    const value = editedConfigs[key];
    if (value !== undefined) {
      updateConfigMutation.mutate({ key, value });
      setEditedConfigs(prev => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const saveWeight = (weight: RejectionWeight) => {
    const edited = editedWeights[weight.id];
    if (edited) {
      updateWeightMutation.mutate({ id: weight.id, penalty: edited.penalty, active: edited.active });
      setEditedWeights(prev => {
        const { [weight.id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const getConfigLabel = (key: string): string => {
    const labels: Record<string, string> = {
      'validation_weight': 'Validation Score Weight',
      'community_weight': 'Community Score Weight',
      'report_penalty': 'Report Penalty (per confirmed)',
      'warning_threshold': 'Warning Threshold',
      'block_threshold': 'Block Threshold',
      'suspension_threshold': 'Suspension Threshold',
      'block_duration_days': 'Block Duration (days)',
      'min_ratings_for_score': 'Min Ratings for Score',
      'benefit_per_song_publish': 'Benefit per Song (IDR)',
      'benefit_per_library_add': 'Benefit per Library Add (IDR)'
    };
    return labels[key] || key;
  };

  if (isLoadingRole || isLoadingConfigs || isLoadingWeights) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Creator Community Score Configuration
        </h1>
        <p className="text-muted-foreground">Configure scoring thresholds and rejection penalties</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Score Thresholds</CardTitle>
            <CardDescription>Configure when warnings, blocks, and suspensions are triggered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {configs?.filter(c => c.config_key.includes('threshold') || c.config_key.includes('weight')).map(config => {
              const currentValue = editedConfigs[config.config_key] ?? Number(config.config_value);
              const hasChanges = editedConfigs[config.config_key] !== undefined;
              const isPercentage = config.config_key.includes('weight');
              
              return (
                <div key={config.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{getConfigLabel(config.config_key)}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {isPercentage ? `${(currentValue * 100).toFixed(0)}%` : currentValue}
                      </span>
                      {hasChanges && (
                        <Button size="sm" variant="ghost" onClick={() => saveConfig(config.config_key)}>
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[currentValue * (isPercentage ? 100 : 1)]}
                    onValueChange={([v]) => handleConfigChange(config.config_key, v / (isPercentage ? 100 : 1))}
                    max={isPercentage ? 100 : 100}
                    step={isPercentage ? 5 : 1}
                  />
                  {config.description && (
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Other Configs */}
        <Card>
          <CardHeader>
            <CardTitle>Other Settings</CardTitle>
            <CardDescription>Block duration, minimum ratings, and benefit amounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configs?.filter(c => !c.config_key.includes('threshold') && !c.config_key.includes('weight')).map(config => {
              const currentValue = editedConfigs[config.config_key] ?? Number(config.config_value);
              const hasChanges = editedConfigs[config.config_key] !== undefined;
              const isCurrency = config.config_key.includes('benefit');
              
              return (
                <div key={config.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label>{getConfigLabel(config.config_key)}</Label>
                    {config.description && (
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={currentValue}
                      onChange={(e) => handleConfigChange(config.config_key, Number(e.target.value))}
                      className="w-32 text-right"
                    />
                    {isCurrency && <span className="text-sm text-muted-foreground">IDR</span>}
                    {hasChanges && (
                      <Button size="sm" variant="ghost" onClick={() => saveConfig(config.config_key)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Weights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Rejection Weight Penalties
          </CardTitle>
          <CardDescription>
            Configure how much each rejection reason affects the creator's validation score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Penalty</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weights?.map(weight => {
                const edited = editedWeights[weight.id];
                const currentPenalty = edited?.penalty ?? Number(weight.weight_penalty);
                const currentActive = edited?.active ?? weight.is_active;
                const hasChanges = edited !== undefined;

                return (
                  <TableRow key={weight.id}>
                    <TableCell className="font-medium capitalize">
                      {weight.rejection_reason.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {weight.description}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={currentPenalty}
                        onChange={(e) => handleWeightChange(weight.id, Number(e.target.value), currentActive)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={currentActive}
                        onCheckedChange={(checked) => handleWeightChange(weight.id, currentPenalty, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {hasChanges && (
                        <Button size="sm" variant="ghost" onClick={() => saveWeight(weight)}>
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
