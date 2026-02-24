import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Users, Gift, Edit, Trash2, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DiscountCodeAssignmentModal from "@/components/admin/DiscountCodeAssignmentModal";

// --- INTERFACES ---
interface DiscountCode {
    id: string;
    code: string;
    discount_value: number;
    discount_type: string;
    billing_cycle: string;
    valid_from: string | null;
    valid_until: string | null;
    max_uses: number | null;
    used_count: number;
    is_active: boolean;
    created_at: string;
}

interface DiscountCodeAssignment {
    id: string;
    discount_code_id: string;
    creator_id: string;
    created_at: string;
    discount_codes: {
        code: string;
    };
    profiles: {
        display_name: string;
    };
}

interface DiscountCodeFormData {
    code: string;
    discount_value: number;
    discount_type: string;
    billing_cycle: string;
    valid_from: Date | null;
    valid_until: Date | null;
    max_uses: number | null;
    is_active: boolean;
    is_new_customer: boolean;
    assigned_creator_id: string | null;
}

interface DiscountCodeWithAssignment extends DiscountCode {
    assigned_creator?: {
        display_name: string;
        email: string;
    } | null;
}

// --- PROPS UNTUK FORM ---
interface DiscountCodeFormProps {
    formData: DiscountCodeFormData;
    setFormData: React.Dispatch<React.SetStateAction<DiscountCodeFormData>>;
    isEdit?: boolean;
    handleSubmit: () => void;
    handleCancel: () => void;
}

// --- KOMPONEN FORM ---
const DiscountCodeForm = ({
    formData,
    setFormData,
    isEdit = false,
    handleSubmit,
    handleCancel,
}: DiscountCodeFormProps) => {
    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="code">Discount Code</Label>
                <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="Enter discount code"
                />
            </div>

            <div>
                <Label htmlFor="discount_type">Discount Type</Label>
                <select
                    id="discount_type"
                    className="w-full border rounded-md p-2"
                    value={formData.discount_type}
                    onChange={(e) =>
                    setFormData({
                        ...formData,
                        discount_type: e.target.value,
                    })
                    }
                >
                    <option value="">Select discount type</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                </select>
            </div>

            <div>
                <Label htmlFor="billing_cycle">Billing Cycle</Label>
                <select
                    id="billing_cycle"
                    className="w-full border rounded-md p-2"
                    value={formData.billing_cycle}
                    onChange={(e) =>
                    setFormData({
                        ...formData,
                        billing_cycle: e.target.value,
                    })
                    }
                >
                    <option value="">Select billing cycle</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>

            <div>
  <Label htmlFor="discount_value">Discount Value</Label>
  <Input
    id="discount_value"
    type="number"
    min={0}
    value={formData.discount_value ?? ""}
    onChange={(e) => {
      let raw = e.target.value;

      if (raw === "") {
        setFormData({ ...formData, discount_value: 0 });
        return;
      }

      let val = parseInt(raw, 10);
      if (isNaN(val)) val = 0;

      if (formData.discount_type === "percentage") {
        // clamp 0–100 hanya untuk percentage
        if (val < 0) val = 0;
        if (val > 100) val = 100;
      } else {
        // fixed → minimal 0, tanpa batas atas
        if (val < 0) val = 0;
      }

      const normalized = String(val);

      setFormData({
        ...formData,
        discount_value: val,
      });

      e.target.value = normalized;
    }}
    placeholder={
      formData.discount_type === "percentage"
        ? "Enter discount percentage"
        : "Enter discount amount"
    }
  />
</div>


            <div>
                <Label htmlFor="max_uses">Max Uses (Optional)</Label>
                <Input
                    id="max_uses"
                    type="number"
                    value={formData.max_uses || ""}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            max_uses: e.target.value
                                ? parseInt(e.target.value)
                                : null,
                        })
                    }
                    placeholder="Leave empty for unlimited uses"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Valid From (Optional)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !formData.valid_from &&
                                        "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.valid_from ? (
                                    format(formData.valid_from, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[9999] w-auto p-0 bg-popover border shadow-lg"
                            align="start"
                            sideOffset={4}
                        >
                            <Calendar
                                mode="single"
                                selected={formData.valid_from || undefined}
                                onSelect={(date) =>
                                    setFormData({
                                        ...formData,
                                        valid_from: date || null,
                                    })
                                }
                                initialFocus
                                className="pointer-events-auto"
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div>
                    <Label>Valid Until (Optional)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !formData.valid_until &&
                                        "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.valid_until ? (
                                    format(formData.valid_until, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="z-[9999] w-auto p-0 bg-popover border shadow-lg"
                            align="start"
                            sideOffset={4}
                        >
                            <Calendar
                                mode="single"
                                selected={formData.valid_until || undefined}
                                onSelect={(date) =>
                                    setFormData({
                                        ...formData,
                                        valid_until: date || null,
                                    })
                                }
                                initialFocus
                                className="pointer-events-auto"
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            is_active: e.target.checked,
                        })
                    }
                />
                <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="is_new_customer"
                    checked={formData.is_new_customer}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            is_new_customer: e.target.checked,
                        })
                    }
                />
                <Label htmlFor="is_new_customer">New Customer Only</Label>
            </div>

            <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit}>
                    {isEdit ? "Update" : "Create"}
                </Button>
            </div>
        </div>
    );
};

// --- KOMPONEN UTAMA ---
const AdminDiscountCodes = () => {
    const [discountCodes, setDiscountCodes] = useState<
        DiscountCodeWithAssignment[]
    >([]);
    const [assignments, setAssignments] = useState<DiscountCodeAssignment[]>(
        []
    );
    const [loading, setLoading] = useState(true);
    const [assignmentsLoading, setAssignmentsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
    const [formData, setFormData] = useState<DiscountCodeFormData>({
        code: "",
        discount_type: "",
        billing_cycle: "monthly",
        discount_value: 0,
        valid_from: null,
        valid_until: null,
        max_uses: null,
        is_active: true,
        is_new_customer: false,
        assigned_creator_id: null,
    });
    const { toast } = useToast();

    const {
        paginatedData,
        currentPage,
        totalPages,
        nextPage,
        prevPage,
        goToPage,
        canGoNext,
        canGoPrev,
        startIndex,
        endIndex,
        totalItems,
    } = usePagination({
        data: discountCodes,
        itemsPerPage: 10,
    });

    useEffect(() => {
        fetchDiscountCodes();
        fetchAssignments();
    }, []);

    const fetchDiscountCodes = async () => {
        try {
            setLoading(true);
            const { data: codes, error: codesError } = await supabase
                .from("discount_codes")
                .select("*")
                .eq("is_production", true)
                .order("created_at", { ascending: false });
            if (codesError) throw codesError;

            const { data: assignments, error: assignmentsError } =
                await supabase
                    .from("discount_code_assignments")
                    .select(
                        `discount_code_id, creator_id, profiles!inner(display_name, user_id)`
                    )
                    .eq("is_production", true);
            if (assignmentsError) throw assignmentsError;

            let creatorEmails: { [key: string]: string } = {};
            assignments?.forEach((assignment) => {
                if (assignment.creator_id) {
                    creatorEmails[
                        assignment.creator_id
                    ] = `${assignment.profiles.display_name
                        ?.toLowerCase()
                        .replace(" ", ".")}@example.com`;
                }
            });

            const transformedData = (codes || []).map((code) => {
                const assignment = assignments?.find(
                    (a) => a.discount_code_id === code.id
                );
                return {
                    ...code,
                    assigned_creator: assignment
                        ? {
                              display_name: assignment.profiles.display_name,
                              email:
                                  creatorEmails[assignment.creator_id] ||
                                  "Unknown",
                          }
                        : null,
                };
            });
            setDiscountCodes(transformedData);
        } catch (error) {
            console.error("Error fetching discount codes:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch discount codes",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async () => {
        try {
            setAssignmentsLoading(true);
            const { data, error } = await supabase
                .from("discount_code_assignments")
                .select(
                    `*, discount_codes!inner(code), profiles!inner(display_name)`
                )
                .eq("is_production", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAssignments(data || []);
        } catch (error) {
            console.error("Error fetching assignments:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch discount code assignments",
            });
        } finally {
            setAssignmentsLoading(false);
        }
    };

    const handleAssignmentComplete = () => {
        fetchAssignments();
        fetchDiscountCodes();
    };

    const handleCreate = async () => {
        try {
            const code = formData.code.trim().toUpperCase();

            // 1️⃣ Validasi discount_value > 0
            if (!formData.discount_value || formData.discount_value <= 0) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Discount value must be greater than 0",
                });
                return;
            }

            // 2️⃣ Cek apakah kode sudah ada
            const { data: existing, error: checkError } = await supabase
                .from("discount_codes")
                .select("id")
                .eq("code", code)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Discount code already exists",
                });
                return;
            }

            // 3️⃣ Handle defaults
            const maxUses =
                formData.max_uses && formData.max_uses > 0
                    ? formData.max_uses
                    : 999999999; // unlimited fallback

            let validFrom;
            if (formData.valid_from) {
                const startDate = new Date(formData.valid_from);
                startDate.setMinutes(
                    startDate.getMinutes() - startDate.getTimezoneOffset()
                );
                validFrom = startDate.toISOString();
            } else {
                validFrom = new Date().toISOString();
            }

            let validUntil;
            if (formData.valid_until) {
                const endDate = new Date(formData.valid_until);
                endDate.setHours(23, 59, 59, 999);
                validUntil = endDate.toISOString();
            } else {
                const futureDate = new Date();
                futureDate.setFullYear(futureDate.getFullYear() + 2000);
                validUntil = futureDate.toISOString();
            }

            // 4️⃣ Insert
            const { error } = await supabase.from("discount_codes").insert({
                code,
                discount_value: formData.discount_value,
                discount_type: formData.discount_type,
                billing_cycle: formData.billing_cycle,
                valid_from: validFrom,
                valid_until: validUntil,
                max_uses: maxUses,
                is_active: formData.is_active,
                is_new_customer: formData.is_new_customer,
                is_production: true,
            });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Discount code created successfully",
            });
            setShowCreateModal(false);
            resetForm();
            fetchDiscountCodes();
        } catch (error) {
            console.error("Error creating discount code:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create discount code",
            });
        }
    };

    const handleUpdate = async () => {
        if (!editingCode) return;

        try {
            const { error } = await supabase
                .from("discount_codes")
                .update({
                    code: formData.code.trim().toUpperCase(),
                    discount_type: formData.discount_type,
                    discount_value: formData.discount_value,
                    billing_cycle: formData.billing_cycle,
                    max_uses: formData.max_uses,
                    valid_from: formData.valid_from?.toISOString(),
                    valid_until: formData.valid_until?.toISOString(),
                    is_active: formData.is_active,
                    is_new_customer: formData.is_new_customer,
                })
                .eq("id", editingCode.id);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Discount code updated successfully",
            });
            setShowEditModal(false);
            setEditingCode(null);
            resetForm();
            fetchDiscountCodes();
        } catch (error) {
            console.error("Error updating discount code:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update discount code",
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this discount code?"))
            return;

        try {
            // cek assignment dulu
            const { data: assignments, error: assignError } = await supabase
                .from("discount_code_assignments")
                .select("id")
                .eq("discount_code_id", id);

            if (assignError) throw assignError;

            if (assignments && assignments.length > 0) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description:
                        "This discount code is already assigned and cannot be deleted",
                });
                return;
            }

            // lanjut delete kalau belum ada assignment
            const { error } = await supabase
                .from("discount_codes")
                .delete()
                .eq("id", id);
            if (error) throw error;

            toast({
                title: "Success",
                description: "Discount code deleted successfully",
            });
            fetchDiscountCodes();
        } catch (error) {
            console.error("Error deleting discount code:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete discount code",
            });
        }
    };

    const resetForm = () => {
        setFormData({
            code: "",
            discount_type: "",
            billing_cycle: "",
            discount_value: 0,
            valid_from: null,
            valid_until: null,
            max_uses: null,
            is_active: true,
            is_new_customer: false,
            assigned_creator_id: null,
        });
    };

    const openEditModal = (code: DiscountCodeWithAssignment) => {
        setEditingCode(code);
        setFormData({
            code: code.code,
            discount_type: code.discount_type,
            billing_cycle: code.billing_cycle,
            discount_value: code.discount_value,
            valid_from: code.valid_from ? new Date(code.valid_from) : null,
            valid_until: code.valid_until ? new Date(code.valid_until) : null,
            max_uses: code.max_uses,
            is_active: code.is_active,
            is_new_customer: (code as any).is_new_customer || false,
            assigned_creator_id: null,
        });
        setShowEditModal(true);
    };

    // Handlers untuk tombol cancel di form
    const handleCancelCreate = () => {
        setShowCreateModal(false);
        resetForm();
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingCode(null);
        resetForm();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Discount Codes Management
                    </h1>
                    <p className="text-muted-foreground">
                        Create and manage discount codes for the platform
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Create Dialog */}
                    <Dialog
                        open={showCreateModal}
                        onOpenChange={setShowCreateModal}
                    >
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => {
                                    resetForm(); // Pastikan form kosong saat membuka
                                    setShowCreateModal(true);
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Code
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    Create New Discount Code
                                </DialogTitle>
                            </DialogHeader>
                            {/* PERBAIKAN: Melewatkan props yang dibutuhkan */}
                            <DiscountCodeForm
                                formData={formData}
                                setFormData={setFormData}
                                handleSubmit={handleCreate}
                                handleCancel={handleCancelCreate}
                                isEdit={false}
                            />
                        </DialogContent>
                    </Dialog>
                    {/* Tombol Assign */}
                    <Button
                        variant="outline"
                        onClick={() => setShowAssignmentModal(true)}
                    >
                        <Users className="h-4 w-4 mr-2" />
                        Assign to Creator
                    </Button>
                </div>
            </div>

            {/* Tampilan Loading dan Daftar Kode Diskon */}
            {loading ? (
                <div className="grid gap-4">
                    {[...Array(5)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="animate-pulse">
                                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-muted rounded w-1/2"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : discountCodes.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">
                            No discount codes yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            Create your first discount code to get started
                        </p>
                        <Button onClick={() => setShowCreateModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Code
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4">
                        {paginatedData.map((code) => (
                            <Card key={code.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Gift className="h-5 w-5" />
                                            <span className="font-mono">
                                                {code.code}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    code.is_active
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {code.is_active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                            {!code.assigned_creator && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        openEditModal(code)
                                                    }
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(code.id)
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Discount
                                            </label>
                                            <div className="mt-1 font-semibold">
                                                {code.discount_value}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Usage
                                            </label>
                                            <div className="mt-1">
                                                {code.used_count} /{" "}
                                                {code.max_uses &&
                                                code.max_uses >= 999999999
                                                    ? "∞"
                                                    : code.max_uses}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Valid From
                                            </label>
                                            <div className="mt-1">
                                                {code.valid_from
                                                    ? new Date(
                                                          code.valid_from
                                                      ).toLocaleDateString()
                                                    : "No limit"}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Valid Until
                                            </label>
                                            <div className="mt-1">
                                                {code.valid_until
                                                    ? (() => {
                                                          const date = new Date(
                                                              code.valid_until
                                                          );
                                                          const limitCheck =
                                                              new Date();
                                                          limitCheck.setFullYear(
                                                              limitCheck.getFullYear() +
                                                                  1500
                                                          ); // threshold "very far in the future"

                                                          return date >
                                                              limitCheck
                                                              ? "No limit"
                                                              : date.toLocaleDateString();
                                                      })()
                                                    : "No limit"}
                                            </div>
                                        </div>
                                    </div>

                                    {code.assigned_creator && (
                                        <div className="border-t pt-3">
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Assigned Creator
                                            </label>
                                            <div className="mt-1 flex items-center gap-2">
                                                <Users className="h-4 w-4 text-primary" />
                                                <span className="font-medium">
                                                    {
                                                        code.assigned_creator
                                                            .display_name
                                                    }
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    (
                                                    {
                                                        code.assigned_creator
                                                            .email
                                                    }
                                                    )
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {startIndex}-{endIndex} of {totalItems}{" "}
                                codes
                            </p>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={prevPage}
                                    disabled={!canGoPrev}
                                >
                                    Previous
                                </Button>
                                {Array.from(
                                    { length: totalPages },
                                    (_, i) => i + 1
                                ).map((page) => (
                                    <Button
                                        key={page}
                                        variant={
                                            currentPage === page
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={nextPage}
                                    disabled={!canGoNext}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Creator Assignments Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Creator Assignments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {assignmentsLoading ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                                </div>
                            ))}
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">
                                No assignments yet
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Assign discount codes to creators to start
                                earning commissions
                            </p>
                            <Button
                                onClick={() => setShowAssignmentModal(true)}
                            >
                                <Users className="h-4 w-4 mr-2" />
                                Create First Assignment
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Gift className="h-4 w-4 text-primary" />
                                        <div>
                                            <span className="font-mono font-medium">
                                                {assignment.discount_codes.code}
                                            </span>
                                            <span className="mx-2 text-muted-foreground">
                                                →
                                            </span>
                                            <span className="font-medium">
                                                {
                                                    assignment.profiles
                                                        .display_name
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(
                                            assignment.created_at
                                        ).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <DiscountCodeAssignmentModal
                isOpen={showAssignmentModal}
                onClose={() => setShowAssignmentModal(false)}
                onAssignmentComplete={handleAssignmentComplete}
            />

            {/* Edit Dialog */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Discount Code</DialogTitle>
                    </DialogHeader>
                    {/* PERBAIKAN: Melewatkan props yang dibutuhkan */}
                    <DiscountCodeForm
                        formData={formData}
                        setFormData={setFormData}
                        handleSubmit={handleUpdate}
                        handleCancel={handleCancelEdit}
                        isEdit={true}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDiscountCodes;
