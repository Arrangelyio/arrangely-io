import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import Select from "react-select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { Settings, Plus, Edit, Users } from "lucide-react";

interface CreatorBenefitConfig {
    id: string;
    creator_id: string;
    benefit_per_song_publish: number;
    benefit_per_library_add: number;
    benefit_discount_code: number;
    is_active: boolean;
    period_start_date?: string;
    period_end_date?: string;
    creator_name: string;
    creator_email: string;
}

interface Creator {
    user_id: string;
    display_name: string;
    email: string;
    role: string;
}

const AdminCreatorBenefits = () => {
    const [configs, setConfigs] = useState<CreatorBenefitConfig[]>([]);
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingConfig, setEditingConfig] =
        useState<CreatorBenefitConfig | null>(null);
    const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
    const [creatorSearchOpen, setCreatorSearchOpen] = useState(false);
    const [songPublishBenefit, setSongPublishBenefit] = useState<string>("0");
    const [libraryAddBenefit, setLibraryAddBenefit] = useState<string>("250");
    const [discountCodeBenefit, setDiscountCodeBenefit] =
        useState<string>("50");
    const [periodStartDate, setPeriodStartDate] = useState<Date>();
    const [periodEndDate, setPeriodEndDate] = useState<Date>();
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

            // Get emails from auth.users via RPC or by joining with user data
            const creatorsWithEmails = await Promise.all(
                (creatorsData || []).map(async (creator) => {
                    const { data: userData } =
                        await supabase.auth.admin.getUserById(creator.user_id);
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
                .select(
                    `
          id,
          creator_id,
          benefit_per_song_publish,
          benefit_per_library_add,
          benefit_discount_code,
          is_active,
          period_start_date,
          period_end_date
        `
                )
                .eq("is_production", true);

            // Join with creator data
            const configsWithCreatorInfo = (configsData || []).map((config) => {
                const creator = creatorsWithEmails.find(
                    (c) => c.user_id === config.creator_id
                );
                return {
                    ...config,
                    creator_name: creator?.display_name || "Unknown Creator",
                    creator_email: creator?.email || "No email",
                };
            });

            setConfigs(configsWithCreatorInfo);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to load creator benefit configurations",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (selectedCreatorIds.length === 0 && !editingConfig) {
            toast({
                title: "Error",
                description: "Please select at least one creator",
                variant: "destructive",
            });
            return;
        }

        try {
            if (editingConfig) {
                // Update existing config
                const benefitData = {
                    benefit_per_song_publish: parseInt(songPublishBenefit) || 0,
                    benefit_per_library_add: parseInt(libraryAddBenefit) || 250,
                    benefit_discount_code: parseInt(discountCodeBenefit) || 50,
                    period_start_date: periodStartDate?.toISOString() || null,
                    period_end_date: periodEndDate?.toISOString() || null,
                };

                const { error } = await supabase
                    .from("creator_benefit_configs")
                    .update(benefitData)
                    .eq("id", editingConfig.id);

                if (error) throw error;

                toast({
                    title: "Success",
                    description: "Benefit configuration updated successfully",
                });
            } else {
                // Create new configs for multiple creators
                const benefitConfigs = selectedCreatorIds.map(creatorId => ({
                    creator_id: creatorId,
                    benefit_per_song_publish: parseInt(songPublishBenefit) || 0,
                    benefit_per_library_add: parseInt(libraryAddBenefit) || 250,
                    benefit_discount_code: parseInt(discountCodeBenefit) || 50,
                    period_start_date: periodStartDate?.toISOString() || null,
                    period_end_date: periodEndDate?.toISOString() || null,
                    is_active: false, // Default to inactive
                    is_production: true,
                }));

                const { error } = await supabase
                    .from("creator_benefit_configs")
                    .insert(benefitConfigs);

                if (error) throw error;

                toast({
                    title: "Success",
                    description: `${selectedCreatorIds.length} benefit configuration(s) created successfully (inactive by default)`,
                });
            }

            setDialogOpen(false);
            setEditingConfig(null);
            setSelectedCreatorIds([]);
            setSongPublishBenefit("0");
            setLibraryAddBenefit("250");
            setDiscountCodeBenefit("50");
            setPeriodStartDate(undefined);
            setPeriodEndDate(undefined);
            fetchData();
        } catch (error) {
            console.error("Error saving config:", error);
            toast({
                title: "Error",
                description: "Failed to save benefit configuration",
                variant: "destructive",
            });
        }
    };

    const handleEdit = (config: CreatorBenefitConfig) => {
        setEditingConfig(config);
        setSelectedCreatorIds([config.creator_id]);
        setSongPublishBenefit(config.benefit_per_song_publish.toString());
        setLibraryAddBenefit(config.benefit_per_library_add.toString());
        setDiscountCodeBenefit(config.benefit_discount_code.toString());
        setPeriodStartDate(
            config.period_start_date
                ? new Date(config.period_start_date)
                : undefined
        );
        setPeriodEndDate(
            config.period_end_date
                ? new Date(config.period_end_date)
                : undefined
        );
        setDialogOpen(true);
    };

    const toggleActive = async (configId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("creator_benefit_configs")
                .update({ is_active: !currentStatus })
                .eq("id", configId);

            if (error) throw error;

            toast({
                title: "Success",
                description: `Configuration ${
                    !currentStatus ? "activated" : "deactivated"
                } successfully`,
            });

            fetchData();
        } catch (error) {
            console.error("Error updating status:", error);
            toast({
                title: "Error",
                description: "Failed to update configuration status",
                variant: "destructive",
            });
        }
    };

    const resetDialog = () => {
        setEditingConfig(null);
        setSelectedCreatorIds([]);
        setSongPublishBenefit("0");
        setLibraryAddBenefit("250");
        setDiscountCodeBenefit("50");
        setPeriodStartDate(undefined);
        setPeriodEndDate(undefined);
    };

    const toggleCreatorSelection = (creatorId: string) => {
        setSelectedCreatorIds(prev => 
            prev.includes(creatorId)
                ? prev.filter(id => id !== creatorId)
                : [...prev, creatorId]
        );
    };

    const removeCreator = (creatorId: string) => {
        setSelectedCreatorIds(prev => prev.filter(id => id !== creatorId));
    };

    const getSelectedCreators = () => {
        if (!creators || !Array.isArray(creators)) return [];
        return creators.filter(creator => selectedCreatorIds.includes(creator.user_id));
    };

    const getAvailableCreators = () => {
        if (!Array.isArray(creators) || !Array.isArray(configs)) return [];
        return creators.filter((creator) =>
            !configs.some((config) => config.creator_id === creator.user_id)
        );
    };

    const CreatorSelect = ({ creators, selectedCreatorIds, setSelectedCreatorIds }) => {
        // transform ke format react-select
        const options = (creators ?? []).map((c) => ({
            value: c.user_id,
            label: `${c.display_name} (${c.email})`,
        }));

        const selectedOptions = options.filter((opt) =>
            (selectedCreatorIds ?? []).includes(opt.value)
        );

        return (
            <Select
            isMulti
            options={options}
            value={selectedOptions}
            onChange={(selected) => {
                const ids = selected.map((s) => s.value);
                setSelectedCreatorIds(ids);
            }}
            placeholder="Search and select creators..."
            className="text-sm"
            classNamePrefix="react-select"
            />
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "No limit";
        return format(new Date(dateString), "MMM dd, yyyy");
    };

    const isPeriodActive = (config: CreatorBenefitConfig) => {
        const now = new Date();
        const startDate = config.period_start_date
            ? new Date(config.period_start_date)
            : null;
        const endDate = config.period_end_date
            ? new Date(config.period_end_date)
            : null;

        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        }

        if (!startDate && !endDate) return config.is_active;
        if (!startDate) return now <= endDate! && config.is_active;
        if (!endDate) return now >= startDate && config.is_active;
        return now >= startDate && now <= endDate && config.is_active;
    };

    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === "") {
            setDiscountCodeBenefit("");
            return;
        }
        const numValue = parseInt(value, 10);

        if (!isNaN(numValue)) {
            if (numValue > 100) {
                setDiscountCodeBenefit("100");
            } else if (numValue < 0) {
                setDiscountCodeBenefit("0");
            } else {
                setDiscountCodeBenefit(numValue.toString());
            }
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Creator Benefits Configuration
                        </h1>
                        <p className="text-muted-foreground">
                            Manage professional creator earning benefits
                        </p>
                    </div>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        Creator Benefits Configuration
                    </h1>
                    <p className="text-muted-foreground">
                        Manage professional creator earning benefits
                    </p>
                </div>
                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetDialog();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button onClick={resetDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Configuration
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingConfig ? "Edit" : "Add"} Creator Benefit
                                Configuration
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            {!editingConfig && (
                                <div className="space-y-3">
                                    <Label htmlFor="creators">Select Creators</Label>

                                    <CreatorSelect
                                        creators={getAvailableCreators()}
                                        selectedCreatorIds={selectedCreatorIds}
                                        setSelectedCreatorIds={setSelectedCreatorIds}
                                    />

                                    <p className="text-xs text-muted-foreground">
                                        Multiple creators can be selected. New configurations will be created as inactive by default.
                                    </p>
                                </div>

                            )}

                            <div className="space-y-2">
                                <Label htmlFor="songBenefit">
                                    Benefit per Song Published (IDR)
                                </Label>
                                <Input
                                    id="songBenefit"
                                    type="number"
                                    value={songPublishBenefit}
                                    onChange={(e) =>
                                        setSongPublishBenefit(e.target.value)
                                    }
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="libraryBenefit">
                                    Benefit per Library Add (IDR)
                                </Label>
                                <Input
                                    id="libraryBenefit"
                                    type="number"
                                    value={libraryAddBenefit}
                                    onChange={(e) =>
                                        setLibraryAddBenefit(e.target.value)
                                    }
                                    placeholder="250"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Amount earned when someone adds this
                                    creator's song to their library
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="discountCodeBenefit">
                                    Discount Code Benefit (%)
                                </Label>
                                <Input
                                    id="discountCodeBenefit"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountCodeBenefit}
                                    onChange={handleDiscountChange} // Gunakan handler baru
                                    placeholder="50"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Percentage of discount amount earned from
                                    assigned discount codes (0-100%)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Period Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !periodStartDate &&
                                                        "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {periodStartDate ? (
                                                    format(
                                                        periodStartDate,
                                                        "PPP"
                                                    )
                                                ) : (
                                                    <span>Pick start date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={periodStartDate}
                                                onSelect={setPeriodStartDate}
                                                initialFocus
                                                className="p-3 pointer-events-auto"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>Period End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !periodEndDate &&
                                                        "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {periodEndDate ? (
                                                    format(periodEndDate, "PPP")
                                                ) : (
                                                    <span>Pick end date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={periodEndDate}
                                                onSelect={setPeriodEndDate}
                                                initialFocus
                                                className="p-3 pointer-events-auto"
                                                disabled={(date) =>
                                                    periodStartDate
                                                        ? date < periodStartDate
                                                        : false
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Leave dates empty for unlimited period. Benefits
                                will only be calculated during the active
                                period.
                            </p>

                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleSave}>
                                    {editingConfig ? "Update" : "Create"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Benefit Configurations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {configs.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                No benefit configurations found
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Create your first configuration to get started
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Creator</TableHead>
                                    <TableHead>Song Publish Benefit</TableHead>
                                    <TableHead>Library Add Benefit</TableHead>
                                    <TableHead>Discount Code Benefit</TableHead>
                                    <TableHead>Period Start</TableHead>
                                    <TableHead>Period End</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {configs.map((config) => (
                                    <TableRow key={config.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div className="font-medium">
                                                    {config.creator_name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {config.creator_email}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(
                                                config.benefit_per_song_publish
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(
                                                config.benefit_per_library_add
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {config.benefit_discount_code}%
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDate(
                                                config.period_start_date
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDate(config.period_end_date)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={config.is_active}
                                                    onCheckedChange={() =>
                                                        toggleActive(
                                                            config.id,
                                                            config.is_active
                                                        )
                                                    }
                                                />
                                                <div className="flex flex-col gap-1">
                                                    <Badge
                                                        variant={
                                                            config.is_active
                                                                ? "default"
                                                                : "secondary"
                                                        }
                                                    >
                                                        {config.is_active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </Badge>
                                                    {config.is_active && (
                                                        <Badge
                                                            variant={
                                                                isPeriodActive(
                                                                    config
                                                                )
                                                                    ? "default"
                                                                    : "destructive"
                                                            }
                                                            className="text-xs"
                                                        >
                                                            {isPeriodActive(
                                                                config
                                                            )
                                                                ? "In Period"
                                                                : "Out of Period"}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleEdit(config)
                                                }
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
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

export default AdminCreatorBenefits;
