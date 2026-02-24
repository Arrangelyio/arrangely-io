import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Globe, Share2 } from "lucide-react"; // Tambahkan Share2
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { localNetworkSync } from "@/lib/capacitor/localNetworkSync";
import { getLocalIP } from "@/lib/capacitor/getLocalIP";

interface ShareSessionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shareUrl: string;
    setlistId?: string;
    songTitle?: string; // Tambahkan prop ini untuk pesan share yang lebih baik
}

const ShareSessionModal = ({
    open,
    onOpenChange,
    shareUrl,
    setlistId,
    songTitle = "this session",
}: ShareSessionModalProps) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [localIP, setLocalIP] = useState<string | null>(null);
    const [isLoadingIP, setIsLoadingIP] = useState(true);
    const [localSyncStarted, setLocalSyncStarted] = useState(false);
    const { toast } = useToast();

    // --- HELPER UNTUK SOSIAL MEDIA ---
    const getShareLinks = () => {
        const urlEncoded = encodeURIComponent(shareUrl);
        const textEncoded = encodeURIComponent(
            `Join my live arrangement session for "${songTitle}" on Arrangely!`
        );

        return {
            whatsapp: `https://wa.me/?text=${textEncoded}%20${urlEncoded}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}`,
        };
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast({
                title: "Link copied!",
                description: "Session link copied to clipboard.",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to copy link",
                variant: "destructive",
            });
        }
    };

    // Logika deteksi IP dan QR Code (Tetap seperti aslinya)
    useEffect(() => {
        if (open && shareUrl) {
            QRCode.toDataURL(shareUrl, { width: 256, margin: 2 }).then(
                setQrCodeUrl
            );
        }
    }, [open, shareUrl]);

    const links = getShareLinks();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[90vw] max-w-xs sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        Share Session
                    </DialogTitle>
                </DialogHeader>

                {/* --- SECTION IKON SOSIAL MEDIA (PINDAH KE SINI) --- */}
                <div className="flex justify-center gap-5 py-4 border-b border-slate-100 dark:border-slate-800 mb-2">
                    {/* WhatsApp */}
                    <a
                        href={links.whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="h-11 w-11 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-sm group-active:scale-90 transition-transform">
                            <svg
                                className="h-6 w-6 fill-current"
                                viewBox="0 0 24 24"
                            >
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.845-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.82-.981z" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">
                            WhatsApp
                        </span>
                    </a>

                    {/* Facebook */}
                    <a
                        href={links.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="h-11 w-11 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-sm group-active:scale-90 transition-transform">
                            <svg
                                className="h-6 w-6 fill-current"
                                viewBox="0 0 24 24"
                            >
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">
                            Facebook
                        </span>
                    </a>

                    {/* Instagram */}
                    <button
                        onClick={() => {
                            copyToClipboard();
                            window.open("https://www.instagram.com/", "_blank");
                        }}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white shadow-sm group-active:scale-90 transition-transform">
                            <svg
                                className="h-6 w-6 fill-current"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">
                            Instagram
                        </span>
                    </button>

                    {/* Copy Link */}
                    <button
                        onClick={copyToClipboard}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm group-active:scale-90 transition-transform">
                            <Share2 className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">
                            Link
                        </span>
                    </button>
                </div>

                <Tabs defaultValue="online" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 mb-4">
                        <TabsTrigger
                            value="online"
                            className="flex items-center gap-2"
                        >
                            <Globe className="h-4 w-4" />
                            Online Session
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="online" className="space-y-4">
                        <div className="flex flex-col items-center space-y-4">
                            {/* QR Code */}
                            <div className="bg-white p-3 rounded-xl shadow-inner border border-slate-100">
                                {qrCodeUrl ? (
                                    <img
                                        src={qrCodeUrl}
                                        alt="QR"
                                        className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                                    />
                                ) : (
                                    <div className="w-44 h-44 flex items-center justify-center bg-muted rounded animate-pulse">
                                        <span className="text-xs">
                                            Generating...
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* URL Input Area */}
                            <div className="w-full flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-transparent px-2 text-[11px] font-mono truncate outline-none text-slate-600 dark:text-slate-300"
                                />
                                <Button
                                    onClick={copyToClipboard}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 hover:bg-white dark:hover:bg-slate-700"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            <p className="text-[10px] text-slate-400 text-center uppercase tracking-tight">
                                Anyone with this link can join as a guest
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default ShareSessionModal;
