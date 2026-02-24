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
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Save, X, Calendar, Award } from 'lucide-react';
import { format } from 'date-fns';

interface CreatorTier {
  id: string;
  tier_name: string;
  tier_icon: string | null;
  min_library_adds: number;
  max_library_adds: number | null;
  benefit_per_add: number;
  description: string | null;
  is_active: boolean;
  is_production: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface TierConfig {
  id: string;
  config_key: string;
  config_value: string | null;
  description: string | null;
}

const AdminCreatorTiers = () => {
  const [tiers, setTiers] = useState<CreatorTier[]>([]);
  const [config, setConfig] = useState<TierConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<CreatorTier | null>(null);
  
  // New tier form
  const [formData, setFormData] = useState({
    tier_name: '',
    tier_icon: '',
    min_library_adds: 0,
    max_library_adds: '' as string | number,
    benefit_per_add: 250,
    description: '',
    is_active: true,
    display_order: 0,
  });
  
  // Config form
  const [countingStartDate, setCountingStartDate] = useState('');
  
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('creator_tiers')
        .select('*')
        .eq('is_production', true)
        .order('display_order', { ascending: true });
      
      if (tiersError) throw tiersError;
      setTiers(tiersData || []);
      
      // Fetch config
      const { data: configData, error: configError } = await supabase
        .from('creator_tier_config')
        .select('*')
        .eq('config_key', 'counting_start_date')
        .eq('is_production', true)
        .maybeSingle();
      
      if (configError) throw configError;
      if (configData) {
        setConfig(configData);
        // Parse the date for the input
        try {
          const date = new Date(configData.config_value || '');
          if (!isNaN(date.getTime())) {
            setCountingStartDate(format(date, "yyyy-MM-dd'T'HH:mm"));
          }
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch creator tiers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      tier_name: '',
      tier_icon: '',
      min_library_adds: 0,
      max_library_adds: '',
      benefit_per_add: 250,
      description: '',
      is_active: true,
      display_order: tiers.length + 1,
    });
  };

  const handleCreateTier = async () => {
    if (!formData.tier_name.trim()) {
      toast({ title: "Error", description: "Tier name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('creator_tiers')
        .insert({
          tier_name: formData.tier_name,
          tier_icon: formData.tier_icon || null,
          min_library_adds: formData.min_library_adds,
          max_library_adds: formData.max_library_adds === '' ? null : Number(formData.max_library_adds),
          benefit_per_add: formData.benefit_per_add,
          description: formData.description || null,
          is_active: formData.is_active,
          display_order: formData.display_order,
          is_production: true,
        });

      if (error) throw error;

      toast({ title: "Success", description: "Tier created successfully" });
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating tier:', error);
      toast({ title: "Error", description: error.message || "Failed to create tier", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTier = async () => {
    if (!selectedTier || !formData.tier_name.trim()) {
      toast({ title: "Error", description: "Tier name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('creator_tiers')
        .update({
          tier_name: formData.tier_name,
          tier_icon: formData.tier_icon || null,
          min_library_adds: formData.min_library_adds,
          max_library_adds: formData.max_library_adds === '' ? null : Number(formData.max_library_adds),
          benefit_per_add: formData.benefit_per_add,
          description: formData.description || null,
          is_active: formData.is_active,
          display_order: formData.display_order,
        })
        .eq('id', selectedTier.id);

      if (error) throw error;

      toast({ title: "Success", description: "Tier updated successfully" });
      setIsEditOpen(false);
      setSelectedTier(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating tier:', error);
      toast({ title: "Error", description: error.message || "Failed to update tier", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTier = async () => {
    if (!selectedTier) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('creator_tiers')
        .delete()
        .eq('id', selectedTier.id);

      if (error) throw error;

      toast({ title: "Success", description: "Tier deleted successfully" });
      setIsDeleteOpen(false);
      setSelectedTier(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting tier:', error);
      toast({ title: "Error", description: error.message || "Failed to delete tier", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!countingStartDate) {
      toast({ title: "Error", description: "Please select a start date", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const dateValue = new Date(countingStartDate).toISOString();
      
      if (config) {
        const { error } = await supabase
          .from('creator_tier_config')
          .update({ config_value: dateValue })
          .eq('id', config.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_tier_config')
          .insert({
            config_key: 'counting_start_date',
            config_value: dateValue,
            description: 'Start date for counting library adds towards tier progression',
            is_production: true,
          });
        
        if (error) throw error;
      }

      toast({ title: "Success", description: "Counting start date updated successfully" });
      fetchData();
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast({ title: "Error", description: error.message || "Failed to update config", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (tier: CreatorTier) => {
    setSelectedTier(tier);
    setFormData({
      tier_name: tier.tier_name,
      tier_icon: tier.tier_icon || '',
      min_library_adds: tier.min_library_adds,
      max_library_adds: tier.max_library_adds ?? '',
      benefit_per_add: tier.benefit_per_add,
      description: tier.description || '',
      is_active: tier.is_active,
      display_order: tier.display_order,
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (tier: CreatorTier) => {
    setSelectedTier(tier);
    setIsDeleteOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatRange = (min: number, max: number | null) => {
    if (max === null) {
      return `> ${min.toLocaleString()}`;
    }
    return `${min.toLocaleString()} – ${max.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading creator tiers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Tier System</h1>
          <p className="text-muted-foreground">
            Manage tier levels for creator_arrangely profiles based on library adds
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Tier</DialogTitle>
              <DialogDescription>Add a new tier level for creators</DialogDescription>
            </DialogHeader>
            <TierForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTier} disabled={saving}>
                {saving ? 'Creating...' : 'Create Tier'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Counting Start Date Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Counting Start Date
          </CardTitle>
          <CardDescription>
            Only library actions after this date will be counted towards tier progression
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="countingStartDate">Start Date & Time</Label>
              <Input
                id="countingStartDate"
                type="datetime-local"
                value={countingStartDate}
                onChange={(e) => setCountingStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleUpdateConfig} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
          {config?.config_value && (
            <p className="text-sm text-muted-foreground mt-2">
              Current: {format(new Date(config.config_value), 'PPpp')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tiers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Tier Levels
          </CardTitle>
          <CardDescription>
            Define tier thresholds and benefits per library add
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Tier Name</TableHead>
                <TableHead>Library Adds Range</TableHead>
                <TableHead>Benefit per Add</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier, index) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.display_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tier.tier_icon}</span>
                      <div>
                        <p className="font-medium">{tier.tier_name}</p>
                        {tier.description && (
                          <p className="text-xs text-muted-foreground">{tier.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatRange(tier.min_library_adds, tier.max_library_adds)}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(tier.benefit_per_add)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(tier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(tier)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tiers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tiers configured yet. Click "Add Tier" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Tier</DialogTitle>
            <DialogDescription>Update tier settings</DialogDescription>
          </DialogHeader>
          <TierForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTier} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTier?.tier_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTier} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Tier Form Component
interface TierFormProps {
  formData: {
    tier_name: string;
    tier_icon: string;
    min_library_adds: number;
    max_library_adds: string | number;
    benefit_per_add: number;
    description: string;
    is_active: boolean;
    display_order: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<TierFormProps['formData']>>;
}

const TierForm: React.FC<TierFormProps> = ({ formData, setFormData }) => {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="tier_name" className="text-right">Name *</Label>
        <Input
          id="tier_name"
          value={formData.tier_name}
          onChange={(e) => setFormData(prev => ({ ...prev, tier_name: e.target.value }))}
          className="col-span-3"
          placeholder="e.g. Session Tier"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="tier_icon" className="text-right">Icon</Label>
        <Input
          id="tier_icon"
          value={formData.tier_icon}
          onChange={(e) => setFormData(prev => ({ ...prev, tier_icon: e.target.value }))}
          className="col-span-3"
          placeholder="e.g. 🎧 (emoji)"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="min_library_adds" className="text-right">Min Adds</Label>
        <Input
          id="min_library_adds"
          type="number"
          value={formData.min_library_adds}
          onChange={(e) => setFormData(prev => ({ ...prev, min_library_adds: Number(e.target.value) }))}
          className="col-span-3"
          min={0}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="max_library_adds" className="text-right">Max Adds</Label>
        <Input
          id="max_library_adds"
          type="number"
          value={formData.max_library_adds}
          onChange={(e) => setFormData(prev => ({ ...prev, max_library_adds: e.target.value === '' ? '' : Number(e.target.value) }))}
          className="col-span-3"
          placeholder="Leave empty for unlimited"
          min={0}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="benefit_per_add" className="text-right">Benefit/Add (Rp)</Label>
        <Input
          id="benefit_per_add"
          type="number"
          value={formData.benefit_per_add}
          onChange={(e) => setFormData(prev => ({ ...prev, benefit_per_add: Number(e.target.value) }))}
          className="col-span-3"
          min={0}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="display_order" className="text-right">Order</Label>
        <Input
          id="display_order"
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData(prev => ({ ...prev, display_order: Number(e.target.value) }))}
          className="col-span-3"
          min={1}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="col-span-3"
          placeholder="Brief description of this tier"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="is_active" className="text-right">Active</Label>
        <div className="col-span-3">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminCreatorTiers;
