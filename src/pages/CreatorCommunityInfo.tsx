import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import {
    TrendingUp,
    Ticket,
    Library,
    Calendar,
    User,
    CheckCircle,
    XCircle,
    Crown,
    Music,
    Coins,
    ArrowRight,
    CalendarCheck,
    Wallet,
    HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreatorProFeatures } from "@/hooks/useCreatorProFeatures";
import CountUpNumber from "@/components/recap/CountUpNumber";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 },
    },
};

const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const,
    },
};

// Premium plan prices (from database)
const PREMIUM_MONTHLY_PRICE = 35000;
const PREMIUM_YEARLY_PRICE = 299000;
const VOUCHER_CASHBACK_PERCENT = 10;

export default function CreatorCommunityInfo() {
    const { earnPerLibraryAdd } = useCreatorProFeatures();
    const earnPerAdd = earnPerLibraryAdd ?? 5000;

    // Calculator state
    const [songsPublished, setSongsPublished] = useState([10]);
    const [libraryAddsPerSong, setLibraryAddsPerSong] = useState([5]);
    const [voucherUsers, setVoucherUsers] = useState([2]);
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
        "monthly",
    );

    // Calculate earnings
    const calculatedEarnings = useMemo(() => {
        const libraryEarnings =
            songsPublished[0] * libraryAddsPerSong[0] * earnPerAdd;
        const planPrice =
            selectedPlan === "monthly"
                ? PREMIUM_MONTHLY_PRICE
                : PREMIUM_YEARLY_PRICE;
        const voucherEarnings =
            voucherUsers[0] * planPrice * (VOUCHER_CASHBACK_PERCENT / 100);
        return {
            library: libraryEarnings,
            voucher: voucherEarnings,
            total: libraryEarnings + voucherEarnings,
        };
    }, [
        songsPublished,
        libraryAddsPerSong,
        voucherUsers,
        selectedPlan,
        earnPerAdd,
    ]);

    const validationChecks = [
        {
            title: "YouTube Link",
            requirement: 'Video harus di kategori "Music"',
            explanation:
                "Gunakan video musik YouTube sebagai backing track (bukan podcast/vlog)",
            good: "Video musik resmi atau cover",
            bad: "Video podcast, vlog, atau tutorial",
        },
        {
            title: "Nama Section",
            requirement: "Semua bagan harus punya nama",
            explanation:
                "Berikan nama setiap bagan lagu (Verse, Chorus, Bridge, dll)",
            good: "Verse 1, Chorus, Bridge",
            bad: "Section tanpa nama",
        },
        {
            title: "Konten Unik",
            requirement: "Kurang dari 50% bagian duplicate",
            explanation:
                "Setiap bagan harus memiliki perbedaan - jangan copy paste lirik/chord yang sama",
            good: "Setiap section wajib memilik konten yang berbeda",
            bad: "Dilarang melakukan copy paste section secara berulang",
        },
        {
            title: "Minimal Pembuatan Section",
            requirement: "Wajib membuat minimal 4 bagan dalam karya aransemen",
            explanation: "Buat minimal 4 bagan dalam arrangement",
            good: "Intro, Verse, Chorus, dan Outro",
            bad: "hanya 2 hingga 3 sections",
        },
        {
            title: "Moderasi Konten",
            requirement: "Tidak ada SARA atau konten negatif",
            explanation:
                "Kami akan melakukan moderasi konten apabila konten mengandung unsur SARA, ujaran kebencian, kata-kata kasar, maupun kata/aksi yang dapat menimbulkan perpecahan.",
            good: " Lirik merupakan lirik resmi dan asli dari pencipta lagu",
            bad: "Mengandung unsur SARA, ujaran kebencian, kata-kata kasar, maupun kata/aksi yang dapat menimbulkan perpecahan.",
        },
    ];

    const faqItems = [
        {
            question: "Berapa lama sampai lagu saya disetujui?",
            answer: "Validasi akan dilakukan secara otomatis oleh AI, Anda akan langsung mendapatkan hasilnya dalam hitungan detik setelah proses validasi.",
        },
        {
            question: "Bagaimana jika lagu saya ditolak?",
            answer: "Anda akan melihat alasan penolakan secara spesifik dan Anda bisa langsung memperbaiki dan melakukan pengajuan ulang. Tidak ada batasan dalam pengajuan ulang.",
        },
        {
            question: "Bagaimana cara mendapatkan kode referral?",
            answer: "Kode Referral akan diberikan secara otomatis melalui sistem setelah profil kreator Anda lengkap dan terverifikasi.",
        },
        {
            question: "Kapan Anda bisa mendapatkan penghasilan Anda",
            answer: "Pembayaran akan dilakukan setiap tanggal 5 bulan berikutnya. Contoh: Pendapatan bulan Februari akan dibayarkan pada tanggal 5 Maret.",
        },
        {
            question: "Berapa minimum penarikan penghasilan?",
            answer: "Minimum penarikan adalah Rp 50.000. Jika saldo kamu belum mencapai batas minimum maka akan diakumulasi ke bulan berikutnya.",
        },
    ];

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-background">
                {/* Hero Section */}
                <section className="relative overflow-hidden py-16 md:py-24 px-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent" />

                    {/* Floating Icons */}
                    <motion.div
                        className="absolute top-20 left-10 text-amber-500/30"
                        animate={floatingAnimation}
                    >
                        <Crown className="h-12 w-12" />
                    </motion.div>
                    <motion.div
                        className="absolute top-32 right-16 text-orange-500/30"
                        animate={{
                            ...floatingAnimation,
                            transition: {
                                ...floatingAnimation.transition,
                                delay: 0.5,
                            },
                        }}
                    >
                        <Music className="h-10 w-10" />
                    </motion.div>
                    <motion.div
                        className="absolute bottom-20 left-1/4 text-amber-400/30"
                        animate={{
                            ...floatingAnimation,
                            transition: {
                                ...floatingAnimation.transition,
                                delay: 1,
                            },
                        }}
                    >
                        <Coins className="h-8 w-8" />
                    </motion.div>

                    <motion.div
                        className="relative max-w-4xl mx-auto text-center"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                            <Crown className="h-3 w-3 mr-1" />
                            Creator Community
                        </Badge>
                        <h1 className="text-3xl md:text-5xl font-bold leading-tight pb-2 mb-4 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent px-2">
                            Bergabung dengan Creator Community
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                            Bagikan aransemen musikmu dan dapatkan penghasilan
                            dari kreativitasmu
                        </p>
                        {!isCapacitorIOS() && (
                            <Button
                                asChild
                                size="lg"
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                            >
                                <Link to="/pricing">
                                    Gabung Sekarang
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                    </motion.div>
                </section>

                {/* Main Benefits Section */}
                <section className="py-12 px-4">
                    <motion.div
                        className="max-w-6xl mx-auto"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        <motion.h2
                            variants={itemVariants}
                            className="max-w-lg mx-auto text-xl md:text-3xl font-bold text-center mb-8 px-4"
                        >
                            Dapatkan Penghasilan Maksimal Bersama ARRANGELY!
                        </motion.h2>

                        <div className="grid md:grid-cols-2 gap-6 px-2">
                            {/* Card 1: Library Add Earnings */}
                            <motion.div variants={itemVariants}>
                                <Card className="h-full border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50/50 hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                                                <TrendingUp className="h-6 w-6" />
                                            </div>
                                            <CardTitle className="text-xl">
                                                Dapatkan{" "}
                                                {formatRupiah(earnPerAdd)},-
                                                setiap Add to Library
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* What is Library Add */}
                                        <div className="p-4 bg-blue-50/80 rounded-lg border border-blue-100">
                                            <p className="text-sm font-medium text-blue-800 mb-2">
                                                💡 Apa itu "Add to Library"?
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                <span className="font-semibold">
                                                    "Add to Library"
                                                </span>{" "}
                                                adalah aksi menyimpan aransemen
                                                lagu kreator kepada library
                                                pribadi pengguna. Dimana
                                                pengguna dapat melalukan edit,
                                                transpose, ataupun rearansemen
                                                lagu sesuai kebutuhan mereka.
                                            </p>
                                        </div>

                                        <p className="text-muted-foreground">
                                            Setiap kali ada pengguna yang
                                            menambahkan aransemen Anda ke
                                            library pribadi mereka, maka Anda
                                            akan mendapatkan{" "}
                                            <span className="font-semibold text-amber-600">
                                                {formatRupiah(earnPerAdd)},-{" "}
                                            </span>
                                            setiap Add to Library.
                                        </p>

                                        {/* Step by step example */}
                                        <div className="p-4 bg-white/80 rounded-lg border border-amber-100 space-y-3">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                📊 Contoh Perhitungan:
                                            </p>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center py-1 border-b border-amber-100/50">
                                                    <span className="text-muted-foreground">
                                                        Total lagu dirilis
                                                    </span>
                                                    <span className="font-semibold">
                                                        10 lagu
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-amber-100/50">
                                                    <span className="text-muted-foreground">
                                                        Rata-rata library add
                                                        per lagu
                                                    </span>
                                                    <span className="font-semibold">
                                                        5 user
                                                    </span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-1 border-b border-amber-100/50 gap-1">
                                                    <span className="text-muted-foreground">
                                                        Total Add to Library
                                                    </span>
                                                    <span className="font-semibold text-right">
                                                        10 × 5 = 50 adds
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-amber-100/50">
                                                    <span className="text-muted-foreground">
                                                        ⁠Penghasilan per Add to
                                                        Library
                                                    </span>
                                                    <span className="font-semibold">
                                                        {formatRupiah(
                                                            earnPerAdd,
                                                        )}
                                                        ,-
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pt-2 mt-2 border-t-2 border-amber-200">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                                                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                                        Total Penghasilan:
                                                    </span>
                                                    <span className="text-sm sm:text-base font-bold text-amber-600">
                                                        50 ×{" "}
                                                        {formatRupiah(
                                                            earnPerAdd,
                                                        )}
                                                        -, ={" "}
                                                        {formatRupiah(
                                                            50 * earnPerAdd,
                                                        )}
                                                        ,-
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Card 2: Voucher Cashback */}
                            <motion.div variants={itemVariants}>
                                <Card className="h-full border-amber-200/50 bg-gradient-to-br from-orange-50 to-amber-50/50 hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-3 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                                                <Ticket className="h-6 w-6" />
                                            </div>
                                            <CardTitle className="text-xl">
                                                {/* 10% Cashback Voucher Code */}
                                                Dapatkan Cashback setiap
                                                Pendaftaran Pengguna Baru
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-muted-foreground">
                                            Dapatkan Cashback_
                                            <span className="font-semibold text-orange-600">
                                                10%
                                            </span>{" "}
                                            setiap pengguna baru yang mendaftar
                                            menggunakan kode _referral Anda.
                                        </p>
                                        <div className="p-4 bg-white/80 rounded-lg border border-orange-100 space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                Contoh Penghasilan:
                                            </p>
                                            <p className="text-sm">
                                                Pengguna baru mendaftar Monthly
                                                Premium{" "}
                                                {formatRupiah(
                                                    PREMIUM_MONTHLY_PRICE,
                                                )}
                                                ,- → maka Anda akan mendapatkan{" "}
                                                <span className="font-semibold text-orange-600">
                                                    {formatRupiah(
                                                        PREMIUM_MONTHLY_PRICE *
                                                            0.1,
                                                    )}
                                                    ,-{" "}
                                                </span>
                                                per pendaftaran.
                                            </p>
                                            <p className="text-sm">
                                                Pengguna baru mendaftar Annual
                                                Premium{" "}
                                                {formatRupiah(
                                                    PREMIUM_YEARLY_PRICE,
                                                )}
                                                ,- → maka Anda akan mendapatkan{" "}
                                                <span className="font-semibold text-orange-600">
                                                    {formatRupiah(
                                                        PREMIUM_YEARLY_PRICE *
                                                            0.1,
                                                    )}
                                                    ,-
                                                </span>{" "}
                                                per pendaftaran.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </motion.div>
                </section>

                {/* Additional Benefits */}
                <section className="py-12 px-4 bg-muted/30">
                    <motion.div
                        className="max-w-6xl mx-auto"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        <motion.h2
                            variants={itemVariants}
                            className="text-2xl md:text-3xl font-bold text-center mb-8"
                        >
                            Benefit Lainnya
                        </motion.h2>

                        <div className="grid md:grid-cols-3 gap-6">
                            <motion.div variants={itemVariants}>
                                <Card className="h-full hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-3 rounded-full bg-amber-100 text-amber-600 mb-4">
                                                <Library className="h-6 w-6" />
                                            </div>
                                            <h3 className="font-semibold mb-2">
                                                Publish ke Community Library
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Bagikan arrangement dengan
                                                ribuan musisi di Indonesia
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="h-full hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-3 rounded-full bg-orange-100 text-orange-600 mb-4">
                                                <Calendar className="h-6 w-6" />
                                            </div>
                                            <h3 className="font-semibold mb-2">
                                                Priority Event Access
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Akses prioritas ke event "Cerita
                                                Musisi" setiap bulan
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card className="h-full hover:shadow-md transition-shadow">
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="p-3 rounded-full bg-amber-100 text-amber-600 mb-4">
                                                <User className="h-6 w-6" />
                                            </div>
                                            <h3 className="font-semibold mb-2">
                                                Creator Profile Page
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Bangun personal brand dengan
                                                halaman profil khusus
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </motion.div>
                </section>

                {/* Earnings Calculator */}
                <section className="py-12 px-4">
                    <motion.div
                        className="max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                            Kalkulator Penghasilan
                        </h2>

                        <Card className="border-amber-200/50">
                            <CardContent className="pt-6 space-y-6">
                                {/* Songs Published Slider */}
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium">
                                            Total lagu yang Anda rilis.
                                        </label>
                                        <span className="text-sm font-semibold text-amber-600">
                                            {songsPublished[0]} lagu
                                        </span>
                                    </div>
                                    <Slider
                                        value={songsPublished}
                                        onValueChange={setSongsPublished}
                                        min={1}
                                        max={50}
                                        step={1}
                                        className="[&_[role=slider]]:bg-amber-500"
                                    />
                                </div>

                                {/* Library Adds Slider */}
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium">
                                            Estimasi “Add to Library” per lagu
                                            per bulan.
                                        </label>
                                        <span className="text-sm font-semibold text-amber-600">
                                            {libraryAddsPerSong[0]} adds
                                        </span>
                                    </div>
                                    <Slider
                                        value={libraryAddsPerSong}
                                        onValueChange={setLibraryAddsPerSong}
                                        min={1}
                                        max={20}
                                        step={1}
                                        className="[&_[role=slider]]:bg-amber-500"
                                    />
                                </div>

                                {/* Voucher Users Slider */}
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium">
                                            Estimasi pengguna kode referral
                                            Anda.
                                        </label>
                                        <span className="text-sm font-semibold text-orange-600">
                                            {voucherUsers[0]} user
                                        </span>
                                    </div>
                                    <Slider
                                        value={voucherUsers}
                                        onValueChange={setVoucherUsers}
                                        min={0}
                                        max={10}
                                        step={1}
                                        className="[&_[role=slider]]:bg-orange-500"
                                    />
                                </div>

                                {/* Plan Selection */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">
                                        Tentukan tipe langganan pengguna kode
                                        referral Anda:
                                    </label>
                                    <RadioGroup
                                        value={selectedPlan}
                                        onValueChange={(v) =>
                                            setSelectedPlan(
                                                v as "monthly" | "yearly",
                                            )
                                        }
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem
                                                value="monthly"
                                                id="monthly"
                                            />
                                            <label
                                                htmlFor="monthly"
                                                className="text-sm cursor-pointer"
                                            >
                                                Monthly{" "}
                                                {formatRupiah(
                                                    PREMIUM_MONTHLY_PRICE,
                                                )}
                                                ,-
                                            </label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem
                                                value="yearly"
                                                id="yearly"
                                            />
                                            <label
                                                htmlFor="yearly"
                                                className="text-sm cursor-pointer"
                                            >
                                                Annual{" "}
                                                {formatRupiah(
                                                    PREMIUM_YEARLY_PRICE,
                                                )}
                                                -,
                                            </label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Results */}
                                <div className="mt-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                                    <h3 className="font-semibold mb-4">
                                        Estimasi Penghasilan
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Total penghasilan dari{" "}
                                                <span className="text-sm font-semibold text-amber-600">
                                                    Add to Library:
                                                </span>
                                            </span>
                                            <span className="font-medium">
                                                {formatRupiah(
                                                    calculatedEarnings.library,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Total penghasilan dari{" "}
                                                <span className="text-sm font-semibold text-amber-600">
                                                    Kode Referral:
                                                </span>
                                            </span>
                                            <span className="font-medium">
                                                {formatRupiah(
                                                    calculatedEarnings.voucher,
                                                )}
                                            </span>
                                        </div>
                                        <div className="border-t border-amber-200 pt-2 mt-2">
                                            <div className="flex justify-between text-lg">
                                                <span className="font-semibold">
                                                    Total:
                                                </span>
                                                <span className="font-bold text-amber-600">
                                                    {formatRupiah(
                                                        calculatedEarnings.total,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </section>

                {/* Validation Requirements */}
                <section className="py-12 px-4 bg-muted/30">
                    <motion.div
                        className="max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
                            Syarat & Ketentuan Aransemen
                        </h2>
                        <p className="text-center text-muted-foreground mb-8">
                            Kami akan melakukan validasi otomatis menggunakan
                            sistem AI
                        </p>

                        <Accordion
                            type="single"
                            collapsible
                            className="space-y-3"
                        >
                            {validationChecks.map((check, index) => (
                                <AccordionItem
                                    key={index}
                                    value={`item-${index}`}
                                    className="bg-card border rounded-lg px-4"
                                >
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                            <span className="font-medium text-left">
                                                {check.title}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4">
                                        <div className="space-y-3 pl-8">
                                            <p className="text-muted-foreground">
                                                {check.explanation}
                                            </p>
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-green-700">
                                                                {check.good}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Contoh yang benar
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
                                                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-red-700">
                                                                {check.bad}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Contoh yang salah
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </motion.div>
                </section>

                {/* How It Works */}
                <section className="py-12 px-4">
                    <motion.div
                        className="max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                            Bagaimana Cara Kerjanya?
                        </h2>

                        <div className="flex flex-wrap md:flex-nowrap items-start justify-center gap-4 md:gap-2">
                            {[
                                {
                                    step: 1,
                                    title: "Subscribe",
                                    icon: Crown,
                                    link: "/pricing",
                                }, // Tambahkan properti link
                                {
                                    step: 2,
                                    title: "Buat Aransemen",
                                    icon: Music,
                                },
                                {
                                    step: 3,
                                    title: "Validasi Otomatis melalui AI",
                                    icon: CheckCircle,
                                },
                                { step: 4, title: "Rilis!", icon: Library },
                                {
                                    step: 5,
                                    title: "Dapatkan Penghasilan",
                                    icon: Coins,
                                },
                            ].map((item, index) => (
                                <div key={index} className="flex items-center">
                                    <div className="flex flex-col items-center text-center w-32 md:w-40">
                                        {/* Jika ada link, gunakan komponen Link untuk interaktivitas */}
                                        {item.link ? (
                                            <Link
                                                to={item.link}
                                                className="group/step"
                                            >
                                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white mb-3 shadow-md transition-transform duration-300 group-hover/step:scale-110 group-hover/step:shadow-lg">
                                                    <item.icon className="h-6 w-6 md:h-7 md:w-7" />
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white mb-3 shadow-md">
                                                <item.icon className="h-6 w-6 md:h-7 md:w-7" />
                                            </div>
                                        )}

                                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 mb-1">
                                            Step {item.step}
                                        </span>
                                        <span className="text-xs md:text-sm font-semibold leading-tight px-2">
                                            {item.title}
                                        </span>
                                    </div>

                                    {index < 4 && (
                                        <div className="hidden md:flex items-center self-start pt-6">
                                            <ArrowRight className="h-4 w-4 text-amber-400" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </section>

                {/* Payout Schedule */}
                <section className="py-12 px-4 bg-muted/30">
                    <motion.div
                        className="max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="p-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                                        <CalendarCheck className="h-10 w-10" />
                                    </div>
                                    <div className="text-center md:text-left">
                                        <h3 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                                            <Wallet className="h-5 w-5" />
                                            Kapan Anda Bisa Melakukan Penarikan?
                                        </h3>
                                        <p className="text-muted-foreground mb-3">
                                            Pembayaran{" "}
                                            <span className="font-semibold text-amber-600">
                                                akan
                                            </span>{" "}
                                            dilakukan setiap tanggal 5 bulan
                                            berikutnyad engan minimum penarikkan
                                            Rp 50.000,-
                                        </p>
                                        <div className="p-3 bg-white/80 rounded-lg border border-amber-100 inline-block">
                                            <p className="text-sm">
                                                <span className="font-medium">
                                                    Contoh:
                                                </span>{" "}
                                                Pendapatan bulan Februari akan
                                                ditransfer pada{" "}
                                                <span className="font-semibold text-amber-600">
                                                    tanggal 5 Maret
                                                </span>
                                                .
                                            </p>
                                        </div>
                                        {/* <p className="text-xs text-muted-foreground mt-3">
                                            * Minimum withdrawal: Rp 50.000
                                        </p> */}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </section>

                {/* Cerita Musisi Event */}
                <section className="py-12 px-4">
                    <motion.div
                        className="max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="border-orange-200/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
                                <Badge className="bg-white/20 text-white border-0 mb-3">
                                    Priority Access untuk Creator Community
                                </Badge>
                                <h3 className="text-2xl font-bold mb-2">
                                    Event "Cerita Musisi"
                                </h3>
                                <p className="opacity-90">
                                    Networking event bulanan dengan musisi
                                    profesional
                                </p>
                            </div>
                            <CardContent className="pt-6">
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="text-center p-4">
                                        <User className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                                        <p className="text-sm font-medium">
                                            Networking
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Bertemu musisi profesional
                                        </p>
                                    </div>
                                    <div className="text-center p-4">
                                        <Music className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                                        <p className="text-sm font-medium">
                                            Learning
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Belajar dari pengalaman mereka
                                        </p>
                                    </div>
                                    <div className="text-center p-4">
                                        <Crown className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                                        <p className="text-sm font-medium">
                                            Community
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Bergabung dengan komunitas
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </section>

                {/* Pricing Card */}
                <section className="py-12 px-4 bg-muted/30">
                    <motion.div
                        className="max-w-md mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
                            <CardHeader className="text-center pb-2">
                                <Badge className="mt-4 mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Creator Community
                                </Badge>
                                <CardTitle className="text-2xl">
                                    Harga Langganan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center p-4 bg-white/80 rounded-lg border border-amber-100">
                                    {/* <p className="text-sm text-muted-foreground line-through">
                                        Rp 59.000/bulan
                                    </p> */}
                                    <p className="text-3xl font-bold text-amber-600">
                                        Rp 59.000
                                        <span className="text-base font-normal">
                                            /bulan
                                        </span>
                                    </p>
                                </div>
                                <div className="text-center p-4 bg-white/80 rounded-lg border border-amber-100">
                                    <p className="text-sm text-muted-foreground">
                                        atau
                                    </p>
                                    <p className="text-2xl font-bold text-amber-600">
                                        Rp 499.000
                                        <span className="text-base font-normal">
                                            /tahun
                                        </span>
                                    </p>
                                    <p className="text-xs text-green-600 font-medium">
                                        Hemat ~30%
                                    </p>
                                </div>
                                {!isCapacitorIOS() && (
                                    <Button
                                        asChild
                                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                                    >
                                        <Link to="/pricing">
                                            Subscribe Now
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </section>

                {/* FAQ Section */}
                <section className="py-12 px-4">
                    <motion.div
                        className="max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
                            <HelpCircle className="h-7 w-7" />
                            Pertanyaan Umum
                        </h2>

                        <Accordion
                            type="single"
                            collapsible
                            className="space-y-3"
                        >
                            {faqItems.map((item, index) => (
                                <AccordionItem
                                    key={index}
                                    value={`faq-${index}`}
                                    className="bg-card border rounded-lg px-4"
                                >
                                    <AccordionTrigger className="hover:no-underline text-left">
                                        {item.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {item.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </motion.div>
                </section>

                {/* Final CTA */}
                <section className="py-16 px-4">
                    <motion.div
                        className="max-w-2xl mx-auto text-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                            Mulai Perjalanan Karir Musikmu Sekarang!
                        </h2>
                        <p className="text-muted-foreground mb-8">
                            ⁠Bergabung dengan ratusan kreator lainnya dan
                            dapatkan penghasilan dari kreativitasmu
                        </p>
                        {!isCapacitorIOS() && (
                            <Button
                                asChild
                                size="lg"
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg animate-pulse"
                            >
                                <Link to="/pricing">
                                    <Crown className="mr-2 h-5 w-5" />
                                    Gabung Creator Community
                                </Link>
                            </Button>
                        )}
                    </motion.div>
                </section>
            </div>
        </TooltipProvider>
    );
}
