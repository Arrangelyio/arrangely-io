import { useState } from "react";
import { LogIn, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";
import logo from "../assets/Final-Logo-Arrangely-Logogram.png";
import FeatureCarousel from "./FeatureCarousel";

interface LoginProps {
    onLoginSuccess: () => void;
    offlineAvailable?: boolean;
    onOfflineContinue?: () => void;
}

export default function Login({ onLoginSuccess, offlineAvailable = false, onOfflineContinue }: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [offlineError, setOfflineError] = useState<string | null>(null);
    const showOffline = offlineAvailable || !navigator.onLine;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[hsl(0,0%,10%)]">
            {/* Left side - Feature Carousel (hidden on small screens) */}
            <div className="hidden lg:flex w-3/5 bg-gradient-to-br from-[hsl(145,35%,12%)] via-[hsl(145,25%,8%)] to-[hsl(0,0%,8%)] items-center justify-center relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full">
                    {/* Gradient orbs */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[hsl(145,50%,25%)] blur-[150px] opacity-20 rounded-full" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[hsl(145,40%,20%)] blur-[120px] opacity-15 rounded-full" />
                    
                    {/* Subtle grid pattern */}
                    <div 
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `
                                linear-gradient(hsl(0,0%,50%) 1px, transparent 1px),
                                linear-gradient(90deg, hsl(0,0%,50%) 1px, transparent 1px)
                            `,
                            backgroundSize: '60px 60px'
                        }}
                    />
                </div>

                {/* Carousel content */}
                <FeatureCarousel />
            </div>

            {/* Right side - Login Form */}
            <div className="w-full lg:w-2/5 flex items-center justify-center bg-[hsl(0,0%,12%)] relative overflow-hidden">
                {/* Subtle ambient glow for login side */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[hsl(145,40%,25%)] blur-[120px] opacity-15 rounded-full pointer-events-none" />

                <div className="w-full max-w-sm p-6 relative z-10">
                    {/* Card Container - Logic Pro style dark card */}
                    <div className="bg-[hsl(0,0%,16%)] border border-[hsl(0,0%,22%)] rounded-xl shadow-2xl p-6">
                        {/* Header Section with Logo */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-14 h-14 mb-4">
                                <img
                                    src={logo}
                                    alt="Arrangely Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h1 className="text-xl font-semibold text-[hsl(0,0%,90%)]">
                                Welcome Back
                            </h1>
                            <p className="text-[hsl(0,0%,50%)] text-sm mt-1">
                                Sign in to Arrangely Live Studio
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* Email Input */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-[hsl(0,0%,55%)] ml-1 uppercase tracking-wider">
                                    Email
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-[hsl(0,0%,40%)]" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                        className="
                                            w-full pl-10 pr-3 py-2.5 
                                            bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,25%)] 
                                            rounded-lg text-sm text-[hsl(0,0%,90%)] 
                                            placeholder:text-[hsl(0,0%,35%)] 
                                            focus:outline-none focus:border-[hsl(145,65%,42%)] focus:ring-1 focus:ring-[hsl(145,65%,42%)/30]
                                            transition-all
                                        "
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-[hsl(0,0%,55%)] ml-1 uppercase tracking-wider">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-[hsl(0,0%,40%)]" />
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="
                                            w-full pl-10 pr-3 py-2.5 
                                            bg-[hsl(0,0%,10%)] border border-[hsl(0,0%,25%)] 
                                            rounded-lg text-sm text-[hsl(0,0%,90%)] 
                                            placeholder:text-[hsl(0,0%,35%)] 
                                            focus:outline-none focus:border-[hsl(145,65%,42%)] focus:ring-1 focus:ring-[hsl(145,65%,42%)/30]
                                            transition-all
                                        "
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-2.5 bg-[hsl(0,50%,15%)] border border-[hsl(0,50%,25%)] rounded-lg flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(0,70%,55%)]" />
                                    <span className="text-[hsl(0,70%,65%)] text-xs">
                                        {error}
                                    </span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="
                                    w-full mt-2 py-3 px-4 
                                    bg-gradient-to-r from-[hsl(145,65%,35%)] to-[hsl(145,55%,30%)]
                                    hover:from-[hsl(145,65%,40%)] hover:to-[hsl(145,55%,35%)]
                                    text-white font-medium text-sm rounded-lg 
                                    transition-all duration-200 
                                    flex items-center justify-center gap-2 
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    shadow-lg shadow-[hsl(145,50%,25%)/20]
                                "
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <LogIn className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            {showOffline && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOfflineError(null);
                                        if (onOfflineContinue) {
                                            onOfflineContinue();
                                        } else {
                                            setOfflineError("Offline data not available yet. Please go online once to sync.");
                                        }
                                    }}
                                    className="
                                        w-full py-2.5 px-4 mt-2
                                        bg-[hsl(220,10%,16%)] hover:bg-[hsl(220,10%,22%)]
                                        text-[hsl(0,0%,80%)] font-medium text-sm rounded-lg
                                        border border-[hsl(220,10%,25%)]
                                        transition-all duration-150
                                    "
                                >
                                    Continue as Guest (Offline)
                                </button>
                            )}

                            {offlineError && (
                                <div className="p-2.5 bg-[hsl(45,60%,15%)] border border-[hsl(45,60%,25%)] rounded-lg flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(45,70%,55%)]" />
                                    <span className="text-[hsl(45,70%,60%)] text-xs">
                                        {offlineError}
                                    </span>
                                </div>
                            )}
                        </form>

                        {/* Footer */}
                        <div className="mt-6 text-center">
                            <p className="text-[10px] text-[hsl(0,0%,40%)]">
                                &copy; {new Date().getFullYear()} Arrangely. All rights reserved.
                            </p>
                        </div>
                    </div>

                    {/* Mobile-only feature hint */}
                    <div className="lg:hidden mt-6 text-center">
                        <p className="text-[hsl(0,0%,50%)] text-xs">
                            Professional backing track player for musicians
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}