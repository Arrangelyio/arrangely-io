import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Captcha, CaptchaRef } from "@/components/ui/captcha";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { countryCodes } from "@/constants/locations";
import { storeIntendedUrl, getIntendedUrl } from "@/utils/redirectUtils";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

interface EventAuthFormProps {
    onAuthSuccess: () => void;
    event: any;
    language: string;
}

export function EventAuthForm({
    onAuthSuccess,
    event,
    language,
}: EventAuthFormProps) {
    const { toast } = useToast();
    const captchaRef = useRef<CaptchaRef>(null);
    const [activeTab, setActiveTab] = useState("signup");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [passwordMismatch, setPasswordMismatch] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);

    // OTP Dialog state
    const [showOtpDialog, setShowOtpDialog] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [otpEmail, setOtpEmail] = useState("");
    const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
    const [otpTimeLeft, setOtpTimeLeft] = useState(0);
    const [resendAttempts, setResendAttempts] = useState(0);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Country code for phone
    const [selectedCountryCode, setSelectedCountryCode] = useState("+62");

    // Sign up form
    const [signupData, setSignupData] = useState({
        displayName: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
    });

    // OTP expiration countdown
    useEffect(() => {
        if (!otpExpiresAt) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const expiry = otpExpiresAt.getTime();
            const timeLeft = Math.max(0, Math.floor((expiry - now) / 1000));

            setOtpTimeLeft(timeLeft);

            if (timeLeft === 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [otpExpiresAt]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;

        const interval = setInterval(() => {
            setResendCooldown((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [resendCooldown]);

    useEffect(() => {
        // Hanya tampilkan error jika pengguna sudah mulai mengetik di 'confirm password'
        if (signupData.confirmPassword.length > 0) {
            if (signupData.password !== signupData.confirmPassword) {
                setPasswordMismatch(true);
            } else {
                setPasswordMismatch(false);
            }
        } else {
            // Jika kolom 'confirm' kosong, jangan tampilkan error
            setPasswordMismatch(false);
        }
    }, [signupData.password, signupData.confirmPassword]);

    // Login form
    const [loginData, setLoginData] = useState({
        email: "",
        password: "",
    });

    const handleSignup = async () => {
        setFormError(null); // <-- TAMBAHKAN INI
        setEmailError(null);
        if (!captchaToken) {
            toast({
                title:
                    language === "id"
                        ? "Verifikasi Diperlukan"
                        : "Verification Required",
                description:
                    language === "id"
                        ? "Silakan selesaikan verifikasi Cloudflare Turnstile"
                        : "Please complete Cloudflare Turnstile verification",
                variant: "destructive",
            });
            return;
        }

        if (signupData.password !== signupData.confirmPassword) {
            toast({
                title:
                    language === "id"
                        ? "Password Tidak Cocok"
                        : "Password Mismatch",
                description:
                    language === "id"
                        ? "Password dan konfirmasi password tidak sama"
                        : "Password and confirm password do not match",
                variant: "destructive",
            });
            return;
        }

        const fullPhoneNumber = selectedCountryCode + signupData.phoneNumber;

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke(
                "signup-prepare-otp",
                {
                    body: {
                        email: signupData.email,
                        password: signupData.password,
                        displayName: signupData.displayName,
                        phoneNumber: fullPhoneNumber,
                        country: "Indonesia", // Default for event registration
                        city: "",
                        bio: "",
                        musicalRole: "member",
                        turnstileToken: captchaToken,
                        usageContext: "event",
                        experienceLevel: "beginner",
                        instruments: [],
                    },
                }
            );

            if (error) {
                console.error("Edge Function error:", error);
                const parsedMessage = (() => {
                    try {
                        const body = JSON.parse(
                            error.context?.response?.body || "{}"
                        );
                        return body.message || body.error || error.message;
                    } catch {
                        return error.message;
                    }
                })();

                if (
                    parsedMessage
                        ?.toLowerCase()
                        .includes("email already registered") ||
                    parsedMessage
                        ?.toLowerCase()
                        .includes("email already exists")
                ) {
                    const translatedMessage =
                        language === "id"
                            ? "Email ini sudah terdaftar. Silakan login."
                            : "This email is already registered. Please log in.";
                    setEmailError(translatedMessage); // Set error spesifik di email
                    setIsLoading(false);
                    return; // Hentikan fungsi
                } // Jika errornya BUKAN soal email, lempar ke catch block

                throw new Error(parsedMessage);
            }

            if (data.error) {
                const rawMessage = data.error || data.message;

                // 🔄 Konversi pesan error menjadi bilingual
                let translatedMessage = rawMessage;
                if (
                    rawMessage
                        ?.toLowerCase()
                        .includes("email already registered") ||
                    rawMessage?.toLowerCase().includes("email already exists")
                ) {
                    translatedMessage =
                        language === "id"
                            ? "Email ini sudah terdaftar. Silakan login."
                            : "This email is already registered. Please log in.";

                    setEmailError(translatedMessage); // <-- GUNAKAN STATE BARU
                    setIsLoading(false); // <-- Jangan lupa stop loading
                    return;
                } else if (
                    rawMessage?.toLowerCase().includes("invalid captcha") ||
                    rawMessage?.toLowerCase().includes("turnstile")
                ) {
                    translatedMessage =
                        language === "id"
                            ? "Verifikasi Cloudflare tidak valid. Silakan coba lagi."
                            : "Invalid Cloudflare verification. Please try again.";
                } else if (
                    rawMessage?.toLowerCase().includes("weak password")
                ) {
                    translatedMessage =
                        language === "id"
                            ? "Password terlalu lemah. Gunakan kombinasi huruf besar, angka, dan simbol."
                            : "Password is too weak. Use a mix of uppercase letters, numbers, and symbols.";
                }

                setFormError(translatedMessage);
                return;
            }

            setOtpEmail(signupData.email);
            // Set OTP expiration time (10 minutes from now)
            const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
            setOtpExpiresAt(expiryTime);
            setResendAttempts(0);
            setResendCooldown(0);

            // Reset captcha token after successful submission
            setCaptchaToken(null);
            captchaRef.current?.reset();

            setShowOtpDialog(true);

            toast({
                title: language === "id" ? "OTP Terkirim" : "OTP Sent",
                description:
                    language === "id"
                        ? "Kami telah mengirim kode OTP ke email Anda"
                        : "We've sent an OTP code to your email",
            });
        } catch (error: any) {
            console.error("Signup error:", error);
            const errorMessage =
                error?.message ||
                error?.error ||
                error?.response?.message ||
                (language === "id"
                    ? "Terjadi kesalahan saat mendaftar"
                    : "An error occurred during signup");

            setFormError(errorMessage); // simpan di state
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otpValue.length !== 6) {
            toast({
                title:
                    language === "id" ? "OTP Tidak Lengkap" : "Incomplete OTP",
                description:
                    language === "id"
                        ? "Silakan masukkan 6 digit kode OTP."
                        : "Please enter the 6-digit OTP code.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke(
                "verify-otp",
                {
                    body: {
                        email: otpEmail,
                        otp: otpValue,
                    },
                }
            );

            // Tangani error HTTP dari Supabase Edge Function
            if (error) {
                console.error("Edge Function error:", error);
                const parsedMessage = (() => {
                    try {
                        const body = JSON.parse(error.context || "{}");
                        return body.error || body.message || error.message; // ✅ INI BENAR
                    } catch {
                        return error.message;
                    }
                })();
                throw new Error(parsedMessage);
            }

            // 🔄 Tangani hasil response dari server (status 200)
            if (data?.success) {
                // ✅ OTP benar dan akun berhasil dibuat
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    const { error: profileError } = await supabase
                        .from("profiles")
                        .upsert({
                            user_id: user.id,
                            display_name: signupData.displayName,
                            email: signupData.email,
                            phone_number:
                                selectedCountryCode + signupData.phoneNumber,
                            is_onboarded: false,
                        });

                    if (profileError)
                        console.error("Profile creation error:", profileError);
                }

                // Auto login setelah verifikasi berhasil
                const { error: signInError } =
                    await supabase.auth.signInWithPassword({
                        email: otpEmail,
                        password: signupData.password,
                    });

                if (signInError) throw signInError;

                setShowOtpDialog(false);
                setOtpExpiresAt(null);

                toast({
                    title:
                        language === "id"
                            ? "Verifikasi Berhasil"
                            : "Verification Successful",
                    description:
                        language === "id"
                            ? "Akun Anda telah berhasil dibuat dan login otomatis."
                            : "Your account has been created and you have been logged in.",
                });

                onAuthSuccess();
                return;
            }

            // ⚠️ Kasus gagal tapi status 200 OK (dari Edge Function)
            if (data?.error) {
                let rawMessage = data.message || data.error;
                let translatedMessage = rawMessage;

                // 🔄 Terjemahan otomatis pesan error umum
                if (
                    rawMessage
                        ?.toLowerCase()
                        .includes("invalid or expired otp") ||
                    rawMessage?.toLowerCase().includes("invalid otp")
                ) {
                    translatedMessage =
                        language === "id"
                            ? "Kode OTP tidak valid atau sudah kedaluwarsa."
                            : "Invalid or expired OTP code.";
                } else if (
                    rawMessage?.toLowerCase().includes("account already exists")
                ) {
                    translatedMessage =
                        language === "id"
                            ? "Akun dengan email ini sudah ada. Silakan login dengan email tersebut."
                            : "An account with this email already exists. Please log in instead.";
                } else if (
                    rawMessage?.toLowerCase().includes("internal server error")
                ) {
                    translatedMessage =
                        language === "id"
                            ? "Terjadi kesalahan pada server. Silakan coba lagi nanti."
                            : "A server error occurred. Please try again later.";
                }

                toast({
                    title:
                        language === "id"
                            ? "Verifikasi Gagal"
                            : "Verification Failed",
                    description: translatedMessage,
                    variant: "destructive",
                });

                return;
            }

            // 🚨 Fallback jika tidak ada struktur data/error jelas
            toast({
                title:
                    language === "id"
                        ? "Verifikasi Gagal"
                        : "Verification Failed",
                description:
                    language === "id"
                        ? "Terjadi kesalahan saat memverifikasi OTP."
                        : "An error occurred while verifying the OTP.",
                variant: "destructive",
            });
        } catch (error: any) {
            console.error("OTP verification error:", error);
            const rawMessage =
                error?.message ||
                error?.error ||
                (language === "id"
                    ? "Terjadi kesalahan saat verifikasi OTP."
                    : "An error occurred during OTP verification.");

            let translatedMessage = rawMessage;

            if (rawMessage?.toLowerCase().includes("invalid or expired otp")) {
                translatedMessage =
                    language === "id"
                        ? "Kode OTP tidak valid atau sudah kedaluwarsa."
                        : "Invalid or expired OTP code.";
            } else if (
                rawMessage?.toLowerCase().includes("account already exists")
            ) {
                translatedMessage =
                    language === "id"
                        ? "Akun dengan email ini sudah terdaftar. Silakan login."
                        : "This email is already registered. Please log in.";
            }

            toast({
                title:
                    language === "id"
                        ? "Verifikasi Gagal"
                        : "Verification Failed",
                description: translatedMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!captchaToken) {
            toast({
                title:
                    language === "id"
                        ? "Verifikasi Diperlukan"
                        : "Verification Required",
                description:
                    language === "id"
                        ? "Silakan selesaikan verifikasi Cloudflare Turnstile"
                        : "Please complete Cloudflare Turnstile verification",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email: loginData.email,
                password: loginData.password,
            });

            if (error) throw error;

            // Check if user is already registered for free event (case 2)
            if (data.user) {
                const isFreeEvent =
                    event.price === 0 ||
                    event.event_ticket_types?.every((type: any) =>
                        type.event_ticket_categories?.every(
                            (cat: any) => cat.price === 0
                        )
                    );

                if (isFreeEvent) {
                    const { data: existingReg } = await supabase
                        .from("event_registrations")
                        .select("id, booking_id")
                        .eq("event_id", event.id)
                        .eq("user_id", data.user.id)
                        .eq("payment_status", "free")
                        .maybeSingle();

                    if (existingReg) {
                        toast({
                            title:
                                language === "id"
                                    ? "Sudah Terdaftar"
                                    : "Already Registered",
                            description:
                                language === "id"
                                    ? "Anda sudah terdaftar untuk event ini. Halaman akan dimuat ulang."
                                    : "You are already registered for this event. Page will refresh.",
                        });
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                        return;
                    }
                }
            }

            toast({
                title:
                    language === "id" ? "Login Berhasil" : "Login Successful",
                description:
                    language === "id"
                        ? "Selamat datang kembali!"
                        : "Welcome back!",
            });

            onAuthSuccess();
        } catch (error: any) {
            console.error("Login error:", error);
            toast({
                title: language === "id" ? "Login Gagal" : "Login Failed",
                description:
                    error.message ||
                    (language === "id"
                        ? "Email atau password salah"
                        : "Invalid email or password"),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            // Simpan halaman saat ini untuk kembali setelah auth
            storeIntendedUrl(getIntendedUrl() || window.location.href);

            const isNative = Capacitor.isNativePlatform();
            // Gunakan deep link scheme untuk native app
            const redirectUrl = isNative
                ? "arrangely.app://auth-callback"
                : `${window.location.origin}/auth-callback`;

            

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true, // PENTING: Cegah redirect otomatis di webview
                },
            });

            if (error) throw error;

            if (data?.url) {
                

                if (isNative) {
                    // Membuka Chrome/System Browser di Android/iOS
                    await Browser.open({
                        url: data.url,
                        windowName: "_system",
                        presentationStyle: "popover",
                    });
                } else {
                    // Di Web biasa, lakukan redirect standar
                    window.location.href = data.url;
                }
            }
        } catch (error: any) {
            console.error("Unexpected Google sign-in error:", error);
            toast({
                title:
                    language === "id"
                        ? "Login Google Gagal"
                        : "Google Sign In Failed",
                description:
                    language === "id"
                        ? "Terjadi kesalahan tidak terduga."
                        : "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            // Matikan loading hanya jika di web
            if (!Capacitor.isNativePlatform()) {
                setIsLoading(false);
            }
        }
    };

    const handleResendOtp = async () => {
        if (resendAttempts >= 3) {
            toast({
                title: language === "id" ? "Batas Tercapai" : "Limit Reached",
                description:
                    language === "id"
                        ? "Anda telah mencapai batas maksimal pengiriman ulang OTP"
                        : "You've reached the maximum OTP resend limit",
                variant: "destructive",
            });
            return;
        }

        if (resendCooldown > 0) {
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.functions.invoke("resend-otp", {
                body: {
                    email: otpEmail,
                    displayName: signupData.displayName,
                    turnstileToken: captchaToken,
                },
            });

            if (error) throw error;

            // Reset OTP expiration time (10 minutes from now)
            const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
            setOtpExpiresAt(expiryTime);
            setResendAttempts((prev) => prev + 1);
            setResendCooldown(60); // 60 seconds cooldown

            // Reset captcha token so user needs to verify again
            setCaptchaToken(null);
            captchaRef.current?.reset();

            toast({
                title: language === "id" ? "OTP Dikirim Ulang" : "OTP Resent",
                description:
                    language === "id"
                        ? "Kami telah mengirim ulang kode OTP ke email Anda"
                        : "We've resent the OTP code to your email",
            });
        } catch (error: any) {
            toast({
                title:
                    language === "id"
                        ? "Gagal Mengirim Ulang"
                        : "Resend Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-[#0A2A66] mb-2">
                        {language === "id"
                            ? "Buat akun baru"
                            : "Create new account"}
                    </h3>
                    <p className="text-[#0A2A66]/70">
                        {language === "id"
                            ? "Keseruan dimulai dari sini. Daftar untuk mengikuti event ini."
                            : "The excitement starts from here. Sign up to join this event."}
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger
                            value="signup"
                            className="flex items-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            {language === "id" ? "Daftar" : "Sign Up"}
                        </TabsTrigger>
                        <TabsTrigger
                            value="login"
                            className="flex items-center gap-2"
                        >
                            <LogIn className="h-4 w-4" />
                            {language === "id" ? "Masuk" : "Login"}
                        </TabsTrigger>
                    </TabsList>

                    {/* Sign Up Form */}
                    <TabsContent value="signup" className="space-y-4">
                        <div>
                            <Label htmlFor="fullname">
                                {language === "id"
                                    ? "Nama Lengkap"
                                    : "Full Name"}{" "}
                                *
                            </Label>
                            <Input
                                id="fullname"
                                value={signupData.displayName}
                                onChange={(e) =>
                                    setSignupData({
                                        ...signupData,
                                        displayName: e.target.value,
                                    })
                                }
                                placeholder={
                                    language === "id"
                                        ? "Nama Lengkap"
                                        : "Full Name"
                                }
                                className="rounded-lg"
                            />
                        </div>

                        <div>
                            <Label htmlFor="signup-email">
                                {language === "id" ? "Email" : "Email Address"}{" "}
                                *
                            </Label>
                            <Input
                                id="signup-email"
                                type="email"
                                value={signupData.email}
                                onChange={(e) =>
                                    setSignupData({
                                        ...signupData,
                                        email: e.target.value,
                                    })
                                }
                                placeholder="email@example.com"
                                className="rounded-lg"
                            />
                        </div>

                        {emailError && (
                            <p className="text-sm text-red-600 mt-1">
                                {emailError}
                            </p>
                        )}

                        <div>
                            <Label htmlFor="phone">
                                {language === "id"
                                    ? "Nomor Telepon"
                                    : "Phone Number"}{" "}
                                *
                            </Label>
                            <div className="flex gap-2">
                                <Select
                                    value={selectedCountryCode}
                                    onValueChange={setSelectedCountryCode}
                                >
                                    <SelectTrigger className="w-[120px] rounded-lg">
                                        <SelectValue placeholder="Code" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {countryCodes.map((country) => (
                                            <SelectItem
                                                key={country.value}
                                                value={country.value}
                                            >
                                                {country.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={signupData.phoneNumber}
                                    onChange={(e) =>
                                        setSignupData({
                                            ...signupData,
                                            phoneNumber: e.target.value,
                                        })
                                    }
                                    placeholder="Enter your phone number"
                                    className="rounded-lg flex-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="signup-password">
                                {language === "id" ? "Password" : "Password"} *
                            </Label>
                            <div className="relative">
                                <Input
                                    id="signup-password"
                                    type={showPassword ? "text" : "password"}
                                    value={signupData.password}
                                    onChange={(e) =>
                                        setSignupData({
                                            ...signupData,
                                            password: e.target.value,
                                        })
                                    }
                                    placeholder={
                                        language === "id"
                                            ? "Masukkan password"
                                            : "Enter password"
                                    }
                                    className="rounded-lg pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0A2A66]/50 hover:text-[#0A2A66]"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="confirm-password">
                                {language === "id"
                                    ? "Konfirmasi Password"
                                    : "Confirm Password"}{" "}
                                *
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirm-password"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={signupData.confirmPassword}
                                    onChange={(e) =>
                                        setSignupData({
                                            ...signupData,
                                            confirmPassword: e.target.value, // <-- INI YANG DIPERBAIKI
                                        })
                                    }
                                    placeholder={
                                        language === "id"
                                            ? "Konfirmasi password"
                                            : "Confirm password"
                                    }
                                    className="rounded-lg pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0A2A66]/50 hover:text-[#0A2A66]"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {passwordMismatch && (
                            <p className="text-sm text-red-600 -mt-2">
                                {language === "id"
                                    ? "Password dan konfirmasi password tidak sama."
                                    : "Passwords do not match."}
                            </p>
                        )}

                        <div className="flex justify-center">
                            <Captcha
                                ref={captchaRef}
                                onChange={setCaptchaToken}
                                onExpired={() => setCaptchaToken(null)}
                            />
                        </div>

                        {formError && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 text-center">
                                {formError}
                            </div>
                        )}

                        <Button
                            onClick={handleSignup}
                            className="w-full bg-[#0A2A66] hover:bg-[#0A2A66]/90 text-white font-semibold rounded-lg"
                            disabled={isLoading || !captchaToken}
                        >
                            {isLoading
                                ? language === "id"
                                    ? "Memproses..."
                                    : "Processing..."
                                : language === "id"
                                ? "Daftar"
                                : "Sign Up"}
                        </Button>

                        <p className="text-xs text-center text-[#0A2A66]/70">
                            {language === "id"
                                ? "Dengan mendaftar, kamu menyetujui "
                                : "By signing up you are agree to our "}
                            <button className="text-[#2E67F8] hover:underline">
                                {language === "id"
                                    ? "Syarat & Ketentuan"
                                    : "Terms & Conditions"}
                            </button>
                            {language === "id" ? " & " : " & "}
                            <button className="text-[#2E67F8] hover:underline">
                                {language === "id"
                                    ? "Kebijakan Privasi"
                                    : "Privacy Policy"}
                            </button>
                            .
                        </p>

                        <div className="text-center text-sm border-t pt-4">
                            <span className="text-[#0A2A66]/70">
                                {language === "id"
                                    ? "Sudah punya akun? "
                                    : "Already have an account? "}
                            </span>
                            <button
                                onClick={() => setActiveTab("login")}
                                className="text-[#2E67F8] hover:underline font-medium"
                            >
                                {language === "id"
                                    ? "Masuk di sini"
                                    : "Login here"}
                            </button>
                        </div>
                    </TabsContent>

                    {/* Login Form */}
                    <TabsContent value="login" className="space-y-4">
                        <Button
                            onClick={handleGoogleSignIn}
                            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <svg
                                    className="mr-2 h-4 w-4"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            {language === "id"
                                ? "Lanjutkan dengan Google"
                                : "Continue with Google"}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-[#0A2A66]/70">
                                    {language === "id"
                                        ? "Atau lanjutkan dengan"
                                        : "Or continue with"}
                                </span>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="login-email">
                                {language === "id" ? "Email" : "Email Address"}{" "}
                                *
                            </Label>
                            <Input
                                id="login-email"
                                type="email"
                                value={loginData.email}
                                onChange={(e) =>
                                    setLoginData({
                                        ...loginData,
                                        email: e.target.value,
                                    })
                                }
                                placeholder="email@example.com"
                                className="rounded-lg"
                            />
                        </div>

                        <div>
                            <Label htmlFor="login-password">
                                {language === "id" ? "Password" : "Password"} *
                            </Label>
                            <Input
                                id="login-password"
                                type="password"
                                value={loginData.password}
                                onChange={(e) =>
                                    setLoginData({
                                        ...loginData,
                                        password: e.target.value,
                                    })
                                }
                                placeholder={
                                    language === "id"
                                        ? "Masukkan password"
                                        : "Enter password"
                                }
                                className="rounded-lg"
                            />
                        </div>

                        <div className="flex justify-center">
                            <Captcha
                                ref={captchaRef}
                                onChange={setCaptchaToken}
                                onExpired={() => setCaptchaToken(null)}
                            />
                        </div>

                        <Button
                            onClick={handleLogin}
                            className="w-full bg-[#0A2A66] hover:bg-[#0A2A66]/90 text-white font-semibold rounded-lg"
                            disabled={isLoading || !captchaToken}
                        >
                            {isLoading
                                ? language === "id"
                                    ? "Memproses..."
                                    : "Processing..."
                                : language === "id"
                                ? "MASUK"
                                : "LOGIN"}
                        </Button>

                        <div className="text-center text-sm border-t pt-4">
                            <span className="text-[#0A2A66]/70">
                                {language === "id"
                                    ? "Belum punya akun? "
                                    : "Don't have an account? "}
                            </span>
                            <button
                                onClick={() => setActiveTab("signup")}
                                className="text-[#2E67F8] hover:underline font-medium"
                            >
                                {language === "id"
                                    ? "Daftar di sini"
                                    : "Sign up here"}
                            </button>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* OTP Verification Dialog */}
            <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {language === "id"
                                ? "Verifikasi Email"
                                : "Email Verification"}
                        </DialogTitle>
                        <DialogDescription className="space-y-2">
                            <p>
                                {language === "id"
                                    ? `Kami telah mengirim kode OTP ke ${otpEmail}. Silakan masukkan kode tersebut di bawah.`
                                    : `We've sent an OTP code to ${otpEmail}. Please enter the code below.`}
                            </p>
                            {otpTimeLeft > 0 && (
                                <p className="text-sm font-medium text-[#2E67F8]">
                                    {language === "id"
                                        ? "Kode berlaku selama: "
                                        : "Code expires in: "}
                                    {Math.floor(otpTimeLeft / 60)}:
                                    {String(otpTimeLeft % 60).padStart(2, "0")}
                                </p>
                            )}
                            {otpTimeLeft === 0 && (
                                <p className="text-sm font-medium text-red-600">
                                    {language === "id"
                                        ? "Kode OTP telah kedaluwarsa. Silakan kirim ulang."
                                        : "OTP code has expired. Please resend."}
                                </p>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-6 py-4">
                        <InputOTP
                            maxLength={6}
                            value={otpValue}
                            onChange={setOtpValue}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>

                        <div className="flex flex-col gap-2 w-full">
                            <Button
                                onClick={handleVerifyOtp}
                                disabled={
                                    isLoading ||
                                    otpValue.length !== 6 ||
                                    otpTimeLeft === 0
                                }
                                className="w-full"
                            >
                                {isLoading
                                    ? language === "id"
                                        ? "Memverifikasi..."
                                        : "Verifying..."
                                    : language === "id"
                                    ? "Verifikasi"
                                    : "Verify"}
                            </Button>

                            <Button
                                onClick={handleResendOtp}
                                variant="outline"
                                disabled={
                                    isLoading ||
                                    resendCooldown > 0 ||
                                    resendAttempts >= 3
                                }
                                className="w-full"
                            >
                                {resendCooldown > 0
                                    ? `${
                                          language === "id" ? "Tunggu" : "Wait"
                                      } ${resendCooldown}s`
                                    : resendAttempts >= 3
                                    ? language === "id"
                                        ? "Batas Tercapai"
                                        : "Limit Reached"
                                    : language === "id"
                                    ? "Kirim Ulang OTP"
                                    : "Resend OTP"}
                            </Button>

                            {resendAttempts > 0 && resendAttempts < 3 && (
                                <p className="text-xs text-center text-muted-foreground">
                                    {language === "id"
                                        ? `Sisa percobaan: ${
                                              3 - resendAttempts
                                          }`
                                        : `Remaining attempts: ${
                                              3 - resendAttempts
                                          }`}
                                </p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
