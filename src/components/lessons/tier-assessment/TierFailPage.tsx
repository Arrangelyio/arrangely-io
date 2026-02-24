import { motion } from "framer-motion";
import {
    RefreshCw,
    Share2,
    Download,
    CheckCircle,
    XCircle,
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareableAchievementCard } from "./ShareableAchievementCard";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface TierFailPageProps {
    tier: string;
    correctCount: number;
    totalQuestions: number;
    wrongQuestions: any[];
    onRetry: () => void;
    category?: string;
    instrument?: string;
}

const motivationalQuotes = [
    "Setiap master pernah menjadi pemula. Terus maju! 💪",
    "Latihan membuat kemajuan. Kamu hampir sampai! 🎵",
    "Mozart juga harus berlatih! Coba lagi? 🎹",
    "Satu-satunya cara untuk berkembang adalah terus mencoba! 🌟",
    "Kamu sedang belajar! Itu yang paling penting! ✨",
];

export const TierFailPage = ({
    tier,
    correctCount,
    totalQuestions,
    wrongQuestions,
    onRetry,
    category = "music",
    instrument,
}: TierFailPageProps) => {
    const [showShareCard, setShowShareCard] = useState(false);
    const [canRetryToday, setCanRetryToday] = useState(true);
    const randomQuote =
        motivationalQuotes[
            Math.floor(Math.random() * motivationalQuotes.length)
        ];

    useEffect(() => {
        const today = new Date().toDateString();
        const retryData = JSON.parse(
            localStorage.getItem("quiz_retry_limit") || "{}",
        );
        if (retryData.date === today && retryData.count >= 1) {
            setCanRetryToday(false);
        }
    }, []);

    const handleRetryWithLimit = () => {
        if (!canRetryToday) return;
        const today = new Date().toDateString();
        localStorage.setItem(
            "quiz_retry_limit",
            JSON.stringify({ date: today, count: 1 }),
        );
        onRetry();
    };

    const handleShare = () => {
        const text = `💪 Saya sedang berlatih ${
            instrument || category
        } di Arrangely! Skor: ${correctCount}/${totalQuestions}. Terus semangat! 🎵`;

        if (navigator.share) {
            navigator
                .share({
                    title: "Progress Arrangely",
                    text: text,
                    url: window.location.origin,
                })
                .catch(() => {
                    navigator.clipboard.writeText(
                        text + " " + window.location.origin,
                    );
                    toast({
                        title: "Disalin ke clipboard!",
                        description: "Bagikan progressmu dengan teman",
                    });
                });
        } else {
            navigator.clipboard.writeText(text + " " + window.location.origin);
            toast({
                title: "Disalin ke clipboard!",
                description: "Bagikan progressmu dengan teman",
            });
        }
    };

    const handleScreenshot = () => {
        setShowShareCard(true);
        toast({
            title: "📸 Ready to Share!",
            description:
                "Take a screenshot of your progress card to share on social media",
            duration: 5000,
        });
    };

    if (showShareCard) {
        return (
            <div className="text-center space-y-6 p-8">
                <div className="space-y-2 mb-6">
                    <h2 className="text-3xl font-bold">Bagikan Progressmu!</h2>
                    <p className="text-muted-foreground">
                        Setiap langkah berarti! Screenshot dan bagikan
                        perjalananmu
                    </p>
                </div>

                <ShareableAchievementCard
                    tier={tier}
                    category={category}
                    instrument={instrument}
                    score={correctCount}
                    totalQuestions={totalQuestions}
                />

                <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                        onClick={handleShare}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                    >
                        <Share2 className="w-5 h-5" />
                        Bagikan Teks
                    </Button>
                    <Button
                        onClick={() => setShowShareCard(false)}
                        variant="outline"
                        size="lg"
                    >
                        Kembali
                    </Button>
                    <Button onClick={onRetry} size="lg" className="gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Coba Lagi
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="text-center space-y-6 p-8">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
            >
                <div className="text-8xl mb-4">💪</div>
            </motion.div>

            <div className="space-y-2">
                <h2 className="text-4xl font-bold">Terus Semangat!</h2>
                <p className="text-xl text-muted-foreground">{randomQuote}</p>
                <p className="text-lg font-semibold mt-4">
                    Kamu menjawab {correctCount} dari {totalQuestions} dengan
                    benar
                </p>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {correctCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Benar</p>
                </div>
                <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
                    <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {totalQuestions - correctCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Salah</p>
                </div>
            </div>

            {/* Bagian "Mari Kita Review" telah dihapus dari sini */}

            <div className="flex gap-3 justify-center flex-wrap">
                <Button
                    onClick={handleScreenshot}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                >
                    <Download className="w-5 h-5" />
                    Dapatkan Kartu Progress
                </Button>
                <Button
                    onClick={handleRetryWithLimit}
                    disabled={!canRetryToday}
                    className="gap-2"
                >
                    {canRetryToday ? (
                        <RefreshCw className="w-5 h-5" />
                    ) : (
                        <Lock className="w-5 h-5" />
                    )}
                    {canRetryToday ? "Coba Lagi" : "Coba Lagi Besok"}
                </Button>
            </div>

            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                Kamu pasti bisa!
            </p>
        </div>
    );
};
