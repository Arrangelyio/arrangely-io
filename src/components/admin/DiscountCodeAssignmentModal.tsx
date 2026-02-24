// @ts-nocheck
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DiscountCodeAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssignmentComplete: () => void;
}

interface DiscountCode {
    id: string;
    code: string;
    discount_value: number;
    discount_type: string;
}

interface Creator {
    user_id: string;
    display_name: string;
}

const DiscountCodeAssignmentModal = ({
    isOpen,
    onClose,
    onAssignmentComplete,
}: DiscountCodeAssignmentModalProps) => {
    const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedDiscountCode, setSelectedDiscountCode] =
        useState<string>("");
    const [selectedCreator, setSelectedCreator] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchDiscountCodes();
            fetchCreators();
        }
    }, [isOpen]);

    const fetchDiscountCodes = async () => {
        try {
            const { data: assignedCodes, error: assignedError } = await supabase
                .from("discount_code_assignments")
                .select("discount_code_id")
                .eq("is_production", true);

            if (assignedError) throw assignedError;

            const assignedCodeIds = assignedCodes.map(
                (a) => a.discount_code_id
            );

            const { data, error } = await supabase
                .from("discount_codes")
                .select("id, code, discount_value, discount_type")
                .eq("is_active", true)
                .eq("is_production", true)
                .not("id", "in", `(${assignedCodeIds.join(",")})`);

            if (error) throw error;
            setDiscountCodes(data || []);
        } catch (error) {
            console.error("Error fetching discount codes:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch discount codes",
            });
        }
    };

    const fetchCreators = async () => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, display_name")
                .eq("role", "creator")
                .eq("is_production", true);

            if (error) throw error;
            setCreators(data || []);
        } catch (error) {
            console.error("Error fetching creators:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch creators",
            });
        }
    };

    const handleAssignment = async () => {
        if (!selectedDiscountCode || !selectedCreator) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please select both a discount code and creator",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from("discount_code_assignments")
                .insert({
                    discount_code_id: selectedDiscountCode,
                    creator_id: selectedCreator,
                    is_production: true,
                });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Discount code assigned to creator successfully",
            });

            onAssignmentComplete();
            onClose();
            setSelectedDiscountCode("");
            setSelectedCreator("");
        } catch (error: any) {
            console.error("Error assigning discount code:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to assign discount code",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Discount Code to Creator</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">
                            Select Discount Code
                        </label>
                        <Select
                            value={selectedDiscountCode}
                            onValueChange={setSelectedDiscountCode}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a discount code" />
                            </SelectTrigger>
                            <SelectContent>
                                {discountCodes.map((code) => (
                                    <SelectItem key={code.id} value={code.id}>
                                        {code.code} ({code.discount_value}
                                        {code.discount_type === "percentage"
                                            ? "%"
                                            : " IDR"}{" "}
                                        off)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Select Creator
                        </label>
                        <Select
                            value={selectedCreator}
                            onValueChange={setSelectedCreator}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a creator" />
                            </SelectTrigger>
                            <SelectContent>
                                {creators.map((creator) => (
                                    <SelectItem
                                        key={creator.user_id}
                                        value={creator.user_id}
                                    >
                                        {creator.display_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleAssignment} disabled={loading}>
                            {loading ? "Assigning..." : "Assign"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default DiscountCodeAssignmentModal;
