import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Guitar, Piano, Drum, Mic } from "lucide-react";

export type UserRole =
    | "guitarist"
    | "keyboardist"
    | "bassist"
    | "drummer"
    | "vocalist";

interface RoleSelectionModalProps {
    isOpen: boolean;
    onRoleSelect: (role: UserRole) => void;
    onClose: () => void;
}

const roles = [
    {
        id: "guitarist" as UserRole,
        name: "Guitarist",
        icon: Guitar,
        description: "View and interact with chord diagrams",
    },
    {
        id: "keyboardist" as UserRole,
        name: "Keyboardist",
        icon: Piano,
        description: "View and interact with chord diagrams",
    },
    {
        id: "bassist" as UserRole,
        name: "Bassist",
        icon: Guitar, // Menggunakan ikon yang sama dengan gitaris
        description: "View and interact with chord diagrams",
    },
    {
        id: "drummer" as UserRole,
        name: "Drummer",
        icon: Drum,
        description: "Access metronome and rhythm tools",
    },
    {
        id: "vocalist" as UserRole,
        name: "Vocalist",
        icon: Mic,
        description: "View lyrics and vocal guides",
    },
];

export const RoleSelectionModal = ({
    isOpen,
    onRoleSelect,
    onClose,
}: RoleSelectionModalProps) => {
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

    const handleConfirm = () => {
        if (selectedRole) {
            onRoleSelect(selectedRole);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select Your Role</DialogTitle>
                    <DialogDescription>
                        Choose your instrument or role to customize your
                        performance experience
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3 my-4">
                    {roles.map((role) => {
                        const Icon = role.icon;
                        return (
                            <Card
                                key={role.id}
                                className={`p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                                    selectedRole === role.id
                                        ? "ring-2 ring-primary bg-accent/30"
                                        : ""
                                }`}
                                onClick={() => setSelectedRole(role.id)}
                            >
                                <div className="flex flex-col items-center text-center space-y-2">
                                    <Icon className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium text-sm">
                                            {role.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {role.description}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedRole}>
                        Confirm
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
