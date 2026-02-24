// src/components/setlist/ViewersList.tsx

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserRole } from "./RoleSelectionModal";
import { Crown, Mic, Guitar, Piano, Drum, User, Users } from "lucide-react";

// Definisikan tipe untuk viewer
interface Viewer {
    id: string;
    name: string;
    avatar_url?: string;
    role?: UserRole;
    isOwner?: boolean;
}

// [BARU] Fungsi untuk menghasilkan warna unik & konsisten dari nama pengguna
const generateColorFromName = (name: string) => {
    let hash = 0;
    if (name.length === 0) return { bg: "bg-slate-500", text: "text-white" };
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    const colorPalette = [
        { bg: "bg-red-500", text: "text-white" },
        { bg: "bg-sky-500", text: "text-white" },
        { bg: "bg-emerald-500", text: "text-white" },
        { bg: "bg-amber-500", text: "text-white" },
        { bg: "bg-purple-500", text: "text-white" },
        { bg: "bg-pink-500", text: "text-white" },
        { bg: "bg-indigo-500", text: "text-white" },
        { bg: "bg-teal-500", text: "text-white" },
    ];
    const index = Math.abs(hash % colorPalette.length);
    return colorPalette[index];
};

// [MODIFIKASI] Helper untuk mendapatkan warna teks berdasarkan peran
const getRoleTextColor = (role?: UserRole | null, isOwner?: boolean) => {
    if (isOwner) return "text-amber-500 dark:text-amber-400";
    switch (role) {
        case "vocalist":
            return "text-emerald-600 dark:text-emerald-400";
        case "guitarist":
            return "text-sky-600 dark:text-sky-400";
        case "keyboardist":
            return "text-purple-600 dark:text-purple-400";
        case "bassist": // [BARU] Tambahkan warna untuk bassist
            return "text-orange-600 dark:text-orange-400";
        case "drummer":
            return "text-red-600 dark:text-red-400";
        default:
            return "text-slate-500 dark:text-slate-400";
    }
};

// [MODIFIKASI] Ganti komponen RoleIcon di bagian atas file
const RoleIcon = ({
    role,
    isOwner,
}: {
    role?: UserRole | null;
    isOwner?: boolean;
}) => {
    let icon;
    let roleName = "Viewer";

    if (isOwner) {
        icon = <Crown className="h-full w-full p-0.5 text-white" />; // Disesuaikan untuk lencana
        roleName = "Music Director";
    } else {
        roleName = role
            ? role.charAt(0).toUpperCase() + role.slice(1)
            : "Viewer";
        switch (role) {
            case "vocalist":
                icon = <Mic className="h-5 w-5" />;
                break; // Ukuran disamakan
            case "guitarist":
                icon = <Guitar className="h-5 w-5" />;
                break;
            case "bassist": // [BARU] Tambahkan ikon untuk bassist
                icon = <Guitar className="h-5 w-5" />;
                break;
            case "keyboardist":
                icon = <Piano className="h-5 w-5" />;
                break;
            case "drummer":
                icon = <Drum className="h-5 w-5" />;
                break;
            default:
                icon = <User className="h-5 w-5" />;
        }
    }

    // Untuk lencana, kita tidak butuh tooltip, jadi kita sederhanakan
    if (!isOwner && !role) {
        // Cek jika ini bukan owner dan bukan peran musik
        return (
            <span className="text-slate-500 dark:text-slate-400">{icon}</span>
        );
    }

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={isOwner ? "" : "text-white"}>{icon}</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{roleName}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const getInitials = (name: string) => {
    const names = name.trim().split(" ");
    if (names.length > 1 && names[names.length - 1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export const ViewersList = ({ viewers }: { viewers: Viewer[] }) => {
    if (viewers.length === 0) {
        return null;
    }

    const sortedViewers = [...viewers].sort((a, b) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
       <div className="flex items-start flex-wrap gap-3">
            {" "}
            {/* Mengurangi gap sedikit */}
            {sortedViewers.map((viewer) => {
                const color = generateColorFromName(viewer.name);
                const roleName = viewer.isOwner
                    ? "Music Director"
                    : viewer.role
                    ? viewer.role.charAt(0).toUpperCase() + viewer.role.slice(1)
                    : "Music Director";

                return (
                    <TooltipProvider key={viewer.id} delayDuration={150}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex flex-col items-center gap-1 w-12 cursor-default -mx-2">
                                    {" "}
                                    {/* Mengurangi lebar dan gap */}
                                    <div className="relative">
                                        {/* [MODIFIKASI] Ukuran Avatar menjadi h-8 w-8 */}
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage
                                                src={viewer.avatar_url}
                                                alt={viewer.name}
                                            />
                                            <AvatarFallback
                                                // [MODIFIKASI] Ukuran teks inisial menjadi text-xs
                                                className={`${color.bg} ${color.text} text-xs font-semibold`}
                                            >
                                                {getInitials(viewer.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {viewer.isOwner && (
                                            // [MODIFIKASI] Ukuran badge Crown menjadi h-3.5 w-3.5
                                            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 ring-1 ring-white dark:ring-slate-900">
                                                {" "}
                                                {/* Ring lebih kecil */}
                                                <Crown className="h-2 w-2 text-white" />{" "}
                                                {/* Icon Crown lebih kecil */}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[0.6rem] leading-tight text-center text-slate-600 dark:text-slate-400 w-full truncate">
                                        {/* Nama depan tetap kecil, bahkan mungkin sedikit lebih kecil jika diperlukan */}
                                        {viewer.name.split(" ")[0]}
                                    </p>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-semibold">{viewer.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {roleName}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </div>
    );
};
