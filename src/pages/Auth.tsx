import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Music,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { logAuthError } from "@/utils/centralizedErrorLogger";
import {
  countriesWithCities,
  countries,
  countryCodes,
} from "@/constants/locations";
import { Textarea } from "@/components/ui/textarea";
import {
  storeIntendedUrl,
  getIntendedUrl,
  clearIntendedUrl,
} from "@/utils/redirectUtils";
import { safariCacheBuster } from "@/utils/safariCacheBuster";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { validateEmail } from "../../utils/emailValidation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Captcha, CaptchaRef } from "@/components/ui/captcha";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";
import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from "@capacitor-community/apple-sign-in";

interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  phoneNumber: string;
  country: string;
  city: string;
  bio: string;
  musicalRole: string;
  usageContext: string;
  experienceLevel: string;
  instruments: string[];
  acceptTerms: boolean;
}

const Auth = () => {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupStep, setSignupStep] = useState(1);
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+62");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Captcha states
  const loginCaptchaRef = useRef<CaptchaRef>(null);
  const signupCaptchaRef = useRef<CaptchaRef>(null);
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(
    null
  );
  const [signupCaptchaToken, setSignupCaptchaToken] = useState<string | null>(
    null
  );
  const [isEventRegistration, setIsEventRegistration] = useState(false);
  const [signupData, setSignupData] = useState<SignupData>({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    phoneNumber: "",
    country: "Indonesia",
    city: "",
    bio: "",
    musicalRole: "",
    usageContext: "",
    experienceLevel: "",
    instruments: [],
    acceptTerms: false,
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const isNative = Capacitor.isNativePlatform();

  const instrumentOptions = [
    { value: "piano", label: "Piano/Keyboard" },
    { value: "guitar", label: "Guitar" },
    { value: "bass", label: "Bass Guitar" },
    { value: "drums", label: "Drums" },
    { value: "vocals", label: "Vocals" },
    { value: "violin", label: "Violin" },
    { value: "cello", label: "Cello" },
    { value: "saxophone", label: "Saxophone" },
    { value: "trumpet", label: "Trumpet" },
    { value: "flute", label: "Flute" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    // Set Indonesia as default and populate cities
    setAvailableCities(countriesWithCities["Indonesia"] || []);

    // --- LOGIC KHUSUS CAPACITOR (DEEP LINK HANDLER) ---
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appUrlOpen", async ({ url }) => {


        // 1. Tutup Browser Overlay (Chrome/Safari)
        await Browser.close();

        // 2. Cek apakah URL mengandung token (Login Berhasil)
        // Format URL biasanya: arrangely.app://auth-callback#access_token=...&refresh_token=...
        if (url.includes("access_token") || url.includes("refresh_token")) {
          try {
            // Ambil bagian setelah tanda pagar (#)
            const hashIndex = url.indexOf("#");
            if (hashIndex !== -1) {
              const hash = url.substring(hashIndex + 1);
              const params = new URLSearchParams(hash);

              const accessToken = params.get("access_token");
              const refreshToken = params.get("refresh_token");

              if (accessToken && refreshToken) {
                console.log(
                  "✅ Token found, setting Supabase session manually..."
                );

                // 3. Set Session ke Supabase
                const { error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (error) throw error;

                // 4. Redirect ke Home
                toast({
                  title: "Login Successful",
                  description: "Welcome back!",
                });
                window.location.href = "/";
              }
            }
          } catch (error: any) {
            console.error("Deep link session error:", error);
            toast({
              title: "Login Error",
              description: "Failed to process login session.",
              variant: "destructive",
            });
          }
        }
      });
    }
    // --------------------------------------------------

    const pendingEvent = localStorage.getItem("pendingEventRegistration");
    if (pendingEvent) {
      setIsEventRegistration(true);
    }

    // Comprehensive Safari cache clearing
    const clearSafariCaches = async () => {
      if (safariCacheBuster.isSafari()) {
        await safariCacheBuster.clearAuthCaches();
      }
    };

    clearSafariCaches();

    // Logic cek session standar (untuk Web / Auto login saat buka app)
    const checkSession = async () => {

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {

        const intendedUrl = getIntendedUrl();
        window.location.href = intendedUrl || "/";
      }
    };

    checkSession();

    // Listen for auth changes (Sisa logic lama)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === "SIGNED_IN" && session) {
        // Kita handle redirect manual di deep link listener untuk mobile,
        // jadi logic redirect di sini opsional/fallback saja.
        if (!Capacitor.isNativePlatform()) {
          const intendedUrl = getIntendedUrl();
          window.location.href = intendedUrl || "/";
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (Capacitor.isNativePlatform()) {
        CapApp.removeAllListeners(); // Bersihkan listener saat unmount
      }
    };
  }, [navigate, toast]);

  const logAuthError = async (
    action: string,
    error: any,
    email?: string,
    metadata?: any
  ) => {
    try {
      await supabase.from("error_logs").insert({
        error_type: "auth_error",
        operation_type: action,
        error_message: error.message || JSON.stringify(error),
        user_agent: navigator.userAgent,
        user_id: null,
        error_details: {
          email: email,
          action: action,
          ...metadata,
        },
      });
    } catch (logError) {
      console.error("Failed to log auth error:", logError);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNative && !loginCaptchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the reCAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Verify captcha token on server before authentication

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);

        await logAuthError("login", error, email, {
          error_code: error.status,
          auth_error_type: error.name,
          is_auth_error:
            error.name === "AuthApiError" || error.name === "AuthError",
        });

        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login Failed",
            description:
              "Invalid email or password. Please check your credentials and try again.",
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email Not Verified",
            description:
              "Please check your email and click the confirmation link before logging in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        const intendedUrl = getIntendedUrl();
        clearIntendedUrl(); // Langsung hapus agar tidak terpakai lagi

        // Menggunakan window.location.href agar konsisten dengan redirect lain di file ini
        window.location.href = intendedUrl || "/";
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error);

      await logAuthError("login_unexpected", error, email, {
        error_type: "unexpected_error",
        caught_in_catch_block: true,
        timestamp: new Date().toISOString(),
      });
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setForgotPasswordEmail("");
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      storeIntendedUrl(getIntendedUrl() || window.location.href);

      const isNative = Capacitor.isNativePlatform();
      const redirectUrl = isNative
        ? "arrangely.app://auth-callback"
        : `${window.location.origin}/auth-callback`;



      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Cek URL di console log HP (via Android Studio Logcat)


        if (isNative) {
          // Membuka Chrome/System Browser
          await Browser.open({
            url: data.url,
            windowName: "_system",
            presentationStyle: "popover", // Tambahan opsional untuk iOS/Android style
          });
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error("No login URL returned from Supabase");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      await logAuthError("google_signin", error, "", {
        provider: "google",
        error_type: "unexpected_error",
      });
      toast({
        title: "Login Failed",
        description: error.message || "Could not open login page",
        variant: "destructive",
      });
    } finally {
      // UBAH BAGIAN INI: Selalu matikan loading biar tidak stuck
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      storeIntendedUrl(getIntendedUrl() || window.location.href);

      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();



      if (isNative && platform === 'ios') {
        // Native iOS: Use Capacitor Apple Sign-In plugin with native UI
        try {
          // Generate a nonce for security
          const rawNonce = crypto.randomUUID();

          const options: SignInWithAppleOptions = {
            clientId: 'arrangely.io.signin',
            redirectURI: 'https://jowuhdfznveuopeqwzzd.supabase.co/auth/v1/callback',
            scopes: 'email name',
            state: crypto.randomUUID(),
            nonce: rawNonce,
          };



          const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);
          


          if (result.response?.identityToken) {
            // Use the identity token to sign in with Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'apple',
              token: result.response.identityToken,
              nonce: rawNonce,
            });

            if (error) {
              console.error("Supabase signInWithIdToken error:", error);
              throw error;
            }



            toast({
              title: "Login Successful",
              description: "Welcome!",
            });
            window.location.href = "/";
          } else {
            throw new Error("No identity token received from Apple");
          }
        } catch (nativeError: any) {
          console.error("Native Apple Sign-In error:", nativeError);

          // User cancelled
          if (nativeError.message?.includes('canceled') ||
              nativeError.message?.includes('cancelled') ||
              nativeError.code === 1001) {

            setIsLoading(false);
            return;
          }

          // For other native errors, fall back to web-based auth

          await handleAppleSignInViaWeb();
        }
      } else if (isNative && platform === 'android') {
        // Android: Apple Sign-In via web with deep link callback
        // Open the website's auth page which will redirect back to the app
        await handleAppleSignInViaWeb();
      } else {
        // Web: Standard Supabase OAuth flow
        const redirectUrl = `${window.location.origin}/auth-callback`;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Apple sign-in error:", error);
      await logAuthError("apple_signin", error, "", {
        provider: "apple",
        error_type: "unexpected_error",
      });
      toast({
        title: "Login Failed",
        description: error.message || "Could not complete Apple Sign-In",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignInViaWeb = async () => {
    try {
      // For iOS Capacitor: Use the production website as intermediary
      // The website will handle OAuth and redirect back to the app with tokens
      // This is more reliable than direct deep link redirects from OAuth providers

      const callbackUrl = "arrangely.app://auth-callback";
      const webAuthUrl = `https://arrangely.io/auth?provider=apple&callback=${encodeURIComponent(callbackUrl)}`;



      toast({
        title: "Opening Sign-In",
        description: "You'll be redirected to sign in via Apple. After signing in, you'll return to the app.",
      });

      // Open in external browser - Safari will handle the OAuth flow
      // After auth completes on arrangely.io, it will redirect to the app via deep link
      await Browser.open({
        url: webAuthUrl,
        windowName: "_blank", // Use _blank for iOS to ensure it opens in Safari
        presentationStyle: "fullscreen", // Fullscreen for better OAuth UX on iOS
      });
    } catch (error: any) {
      console.error("Web Apple Sign-In error:", error);
      throw error;
    }
  };

  // Handle the provider query param for web-initiated auth (used by mobile fallback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    const callbackRaw = urlParams.get('callback');

    if (provider === 'apple' && callbackRaw) {
      // Decode the callback URL (it was URL-encoded when passed from mobile)
      const callback = decodeURIComponent(callbackRaw);

      // This is a request from mobile app to initiate Apple Sign-In


      // Store the callback URL for after auth completes
      localStorage.setItem('mobileAuthCallback', callback);


      // Initiate Apple Sign-In via Supabase
      supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
          skipBrowserRedirect: false,
        },
      });
    }
  }, []);


  const handleSignUpStep1 = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email first
    const emailValidation = validateEmail(signupData.email);
    if (!emailValidation.isValid) {
      toast({
        title: "Invalid Email",
        description: emailValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!signupData.acceptTerms) {
      toast({
        title: "Terms and Conditions Required",
        description: "Please accept the Terms and Conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    setSignupStep(2);
  };

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "_")
      .replace(/^-+|-+$/g, "");
  };

  const handleSignUpStep2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNative && !signupCaptchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the reCAPTCHA verification",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {



      const generatedSlug = createSlug(signupData.displayName);

      // panggil Edge Function signup-prepare-otp
      const { data, error } = await supabase.functions.invoke(
        "signup-prepare-otp",
        {
          body: {
            email: signupData.email,
            password: signupData.password,
            displayName: signupData.displayName,
            phoneNumber: signupData.phoneNumber,
            country: signupData.country,
            city: signupData.city,
            bio: signupData.bio,
            musicalRole: signupData.musicalRole,
            usageContext: signupData.usageContext,
            experienceLevel: signupData.experienceLevel,
            instruments: signupData.instruments,
            creator_slug: generatedSlug,
            turnstileToken: isNative ? null : signupCaptchaToken,
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to call signup-prepare-otp");
      }

      if (data?.error) {
        // Edge Function balikin error
        if (data.error.includes("Account Already Exists")) {
          toast({
            title: "Account Already Exists",
            description:
              "An account with this email already exists. Please try signing in instead, or use a different email address.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          });
        }
        setIsLoading(false);
        return;
      }

      // sukses

      setIsOtpSent(true);
      setSignupStep(3);

      // Reset captcha token after successful submission
      setSignupCaptchaToken(null);
      signupCaptchaRef.current?.reset();

      toast({
        title: "Verification Code Sent!",
        description:
          "Please check your email for the 6-digit verification code.",
      });
    } catch (err: any) {
      console.error("Error in signup step 2:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {


      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: {
          email: signupData.email,
          otp: otpCode,
        },
      });

      if (error) {
        console.error("OTP verification error:", error);
        throw new Error(error.message || "Invalid verification code");
      }

      if (data && data.error) {
        console.error("OTP verification failed:", data.error);
        // Check if it's an account already exists error
        if (data.error === "Account Already Exists") {
          toast({
            title: "Account Already Exists",
            description:
              data.details ||
              "An account with this email already exists. Please try signing in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Verification Failed",
            description:
              data.details ||
              data.error ||
              "Invalid or expired code. Please try again.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
        return;
      }



      // Now sign in the user automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signupData.email,
        password: signupData.password,
      });

      if (signInError) {
        console.error("Error signing in after verification:", signInError);
        toast({
          title: "Account Created",
          description:
            "Your account was created but auto-login failed. Please sign in manually using the Login tab.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome to Arrangely!",
        description: "Your account has been created and you're now logged in.",
      });

      // Navigate to home page (user is now logged in)
      const intendedUrl = getIntendedUrl();
      clearIntendedUrl();
      localStorage.removeItem("pendingEventRegistration");
      window.location.href = intendedUrl || "/";
      return;
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Verification Failed",
        description:
          error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-otp", {
        body: {
          email: signupData.email,
          displayName: signupData.displayName,
          turnstileToken: isNative ? null : signupCaptchaToken,
        },
      });

      // error dari supabase client (misalnya gagal request)
      if (error) {
        throw new Error(error.message || "Failed to call resend-otp function");
      }

      // error dari edge function (misalnya OTP gagal diupdate)
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "New Code Sent!",
        description: "A new verification code has been sent to your email.",
      });

      // Reset captcha token after successful resend
      setSignupCaptchaToken(null);
      signupCaptchaRef.current?.reset();

      // start cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Error resending OTP:", err);
      toast({
        title: "Error",
        description: err.message || "Unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    setSignupData((prev) => ({
      ...prev,
      instruments: checked
        ? [...prev.instruments, instrument]
        : prev.instruments.filter((i) => i !== instrument),
    }));
  };

  const handleCountryChange = (country: string) => {
    setSignupData((prev) => ({
      ...prev,
      country: country,
      city: "", // Reset city when country changes
    }));
    setAvailableCities(countriesWithCities[country] || []);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-sanctuary flex justify-center p-4 overflow-y-auto
    ${
      isNative
        ? "items-start pt-32 pb-48" // pt dikurangi, pb ditambah drastis (48 = 192px)
        : "items-center pt-20 pb-10"
    }
  `}
    >
      <div className="w-full max-w-md">
        <div className="mb-4" />

        <Card>
          <CardHeader>
            <CardTitle>
              {/* Welcome */}
              {t("login.title")}
            </CardTitle>
            <CardDescription>
              {/* Sign in to your account or create a new one to get started */}
              {t("signUp.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("login.login")}</TabsTrigger>
                <TabsTrigger value="signup">{t("login.signUp")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  {!showForgotPassword ? (
                    <>
                      <Button
                        onClick={handleGoogleSignIn}
                        className="w-full bg-card hover:bg-muted text-foreground border border-border"
                        disabled={isLoading}
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                        {t("login.google")}
                      </Button>

                      <Button
                        onClick={handleAppleSignIn}
                        className="w-full bg-foreground hover:bg-foreground/90 text-background"
                        disabled={isLoading}
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        {t("login.apple") || "Continue with Apple"}
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            {t("login.continue")}
                          </span>
                        </div>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder={t("login.email")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <Button
                              type="button"
                              variant="link"
                              className="px-0 h-auto text-sm text-primary hover:underline"
                              onClick={() => setShowForgotPassword(true)}
                            >
                              {/* Forgot password? */}
                              {t("login.forgot")}
                            </Button>
                          </div>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder={t("login.password")}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              disabled={isLoading}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                              onClick={() => setShowPassword((prev) => !prev)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {!isNative && (
                          <div>
                            <Captcha
                              ref={loginCaptchaRef}
                              onChange={(token) => setLoginCaptchaToken(token)}
                              onExpired={() => setLoginCaptchaToken(null)}
                            />
                          </div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-gradient-worship hover:opacity-90"
                          disabled={
                            isLoading || (!isNative && !loginCaptchaToken)
                          }
                        >
                          {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {t("login.buttonSign")}
                        </Button>
                      </form>
                    </>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="signup">
                {signupStep === 1 && (
                  <form onSubmit={handleSignUpStep1} className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {t("signUp.createAcc")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {/* Step 1 of 3 - Basic Information */}
                        {t("signUp.basic1")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-name">
                        {/* Display Name * */}
                        {t("signUp.displayName")}
                      </Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder={t("signUp.yourName")}
                        value={signupData.displayName}
                        onChange={(e) =>
                          setSignupData((prev) => ({
                            ...prev,
                            displayName: e.target.value,
                          }))
                        }
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        value={signupData.email}
                        onChange={(e) =>
                          setSignupData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"} // Dinamis
                          placeholder={t("signUp.createStrong")}
                          value={signupData.password}
                          onChange={(e) =>
                            setSignupData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          required
                          disabled={isLoading}
                          className="pr-10" // Tambahkan padding kanan
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowSignupPassword((prev) => !prev)}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Ganti bagian input confirm password di form Sign Up */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"} // Dinamis
                          placeholder={t("signUp.confirmPass")}
                          value={signupData.confirmPassword}
                          onChange={(e) =>
                            setSignupData((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          required
                          disabled={isLoading}
                          className="pr-10" // Tambahkan padding kanan
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="accept-terms"
                        checked={signupData.acceptTerms}
                        onCheckedChange={(checked) =>
                          setSignupData((prev) => ({
                            ...prev,
                            acceptTerms: !!checked,
                          }))
                        }
                        className="mt-1"
                      />
                      <Label
                        htmlFor="accept-terms"
                        className="text-sm leading-5"
                      >
                        I agree to the{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Terms and Conditions
                        </a>{" "}
                        and{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Privacy Policy
                        </a>
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className={`w-full bg-gradient-worship hover:opacity-90 ${
                        isNative ? "mb-6" : ""
                      }`}
                      disabled={!signupData.acceptTerms}
                    >
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                )}

                {signupStep === 2 && (
                  <form onSubmit={handleSignUpStep2} className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">
                        Profile Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {/* Step 2 of 3 - Tell us about yourself */}
                        {t("signUp.step2")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-number">
                        {/* Phone Number * */}
                        {t("signUp.phone")}
                      </Label>
                      <div className="flex">
                        <Select
                          value={selectedCountryCode}
                          onValueChange={setSelectedCountryCode}
                        >
                          <SelectTrigger className="w-[120px] rounded-r-none border-r-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50 max-h-60 overflow-y-auto">
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
                          id="phone-number"
                          type="tel"
                          placeholder="Enter your phone number"
                          value={signupData.phoneNumber}
                          onChange={(e) =>
                            setSignupData((prev) => ({
                              ...prev,
                              phoneNumber: e.target.value,
                            }))
                          }
                          className="rounded-l-none"
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {/* Country * */}
                        {t("auth.country")}
                      </Label>
                      <Select
                        value={signupData.country}
                        onValueChange={handleCountryChange}
                        required={!isEventRegistration}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50 max-h-60 overflow-y-auto">
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("signUp.city")}</Label>
                      <Select
                        value={signupData.city}
                        onValueChange={(value) =>
                          setSignupData((prev) => ({
                            ...prev,
                            city: value,
                          }))
                        }
                        required
                        disabled={!signupData.country}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              signupData.country
                                ? t("signUp.selectYourCity")
                                : "Please select country first"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50 max-h-60 overflow-y-auto">
                          {availableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">{t("signUp.bio")}</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us a bit about yourself, your musical background, or experience..."
                        value={signupData.bio}
                        onChange={(e) =>
                          setSignupData((prev) => ({
                            ...prev,
                            bio: e.target.value,
                          }))
                        }
                        className="min-h-[80px]"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {/* What's your primary musical role? * */}
                        {t("signUp.primary")}
                      </Label>
                      <Select
                        value={signupData.musicalRole}
                        onValueChange={(value) =>
                          setSignupData((prev) => ({
                            ...prev,
                            musicalRole: value,
                          }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          <SelectItem value="keyboardist">
                            Keyboardist/Pianist
                          </SelectItem>
                          <SelectItem value="guitarist">Guitarist</SelectItem>
                          <SelectItem value="bassist">Bass Player</SelectItem>
                          <SelectItem value="drummer">Drummer</SelectItem>
                          <SelectItem value="vocalist">
                            Vocalist/Singer
                          </SelectItem>
                          <SelectItem value="worship_leader">
                            Worship Leader
                          </SelectItem>
                          <SelectItem value="music_director">
                            Music Director
                          </SelectItem>
                          <SelectItem value="sound_engineer">
                            Sound Engineer
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {/* Where will you use Arrangely? * */}
                        {t("signUp.where")}
                      </Label>
                      <Select
                        value={signupData.usageContext}
                        onValueChange={(value) =>
                          setSignupData((prev) => ({
                            ...prev,
                            usageContext: value,
                          }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select usage context" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          <SelectItem value="church">
                            Church/Worship Service
                          </SelectItem>
                          <SelectItem value="event">Events/Weddings</SelectItem>
                          <SelectItem value="cafe">Cafe/Restaurant</SelectItem>
                          <SelectItem value="concert">
                            Concerts/Performances
                          </SelectItem>
                          <SelectItem value="studio">
                            Recording Studio
                          </SelectItem>
                          <SelectItem value="personal">
                            Personal Practice
                          </SelectItem>
                          <SelectItem value="education">
                            Education/Teaching
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {/* Experience Level * */}
                        {t("signUp.expLevel")}
                      </Label>
                      <Select
                        value={signupData.experienceLevel}
                        onValueChange={(value) =>
                          setSignupData((prev) => ({
                            ...prev,
                            experienceLevel: value,
                          }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your level" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          <SelectItem value="beginner">
                            Beginner (0-2 years)
                          </SelectItem>
                          <SelectItem value="intermediate">
                            Intermediate (2-5 years)
                          </SelectItem>
                          <SelectItem value="advanced">
                            Advanced (5+ years)
                          </SelectItem>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {/* Instruments you play (optional) */}
                        {t("signUp.inst")}
                      </Label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {instrumentOptions.map((instrument) => (
                          <div
                            key={instrument.value}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={instrument.value}
                              checked={signupData.instruments.includes(
                                instrument.value
                              )}
                              onCheckedChange={(checked) =>
                                handleInstrumentChange(
                                  instrument.value,
                                  !!checked
                                )
                              }
                            />
                            <Label
                              htmlFor={instrument.value}
                              className="text-sm"
                            >
                              {instrument.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Captcha
                        ref={signupCaptchaRef}
                        onChange={(token) => setSignupCaptchaToken(token)}
                        onExpired={() => setSignupCaptchaToken(null)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSignupStep(1)}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-worship hover:opacity-90"
                        disabled={
                          isLoading ||
                          !signupData.phoneNumber ||
                          !signupCaptchaToken ||
                          (!isNative && !signupCaptchaToken) ||
                          (!isEventRegistration &&
                            (!signupData.country ||
                              !signupData.city ||
                              !signupData.musicalRole ||
                              !signupData.usageContext ||
                              !signupData.experienceLevel))
                        }
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Send Verification Code
                      </Button>
                    </div>
                  </form>
                )}

                {signupStep === 3 && (
                  <form onSubmit={handleOTPVerification} className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">
                        Verify Your Email
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {/* Step 3 of 3 - Enter the verification code */}
                        {t("signUp.enterVerif")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {t("signUp.send")} <strong>{signupData.email}</strong>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otp-code">Verification Code *</Label>
                      <Input
                        id="otp-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={otpCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setOtpCode(value);
                        }}
                        className="text-center text-2xl tracking-wider"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-worship hover:opacity-90"
                      disabled={isLoading || otpCode.length !== 6}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {/* Verify & Create Account */}
                      {t("signUp.buttonVerify")}
                    </Button>

                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {/* Didn't receive the code? */}
                        {t("signUp.didntCode")}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResendOTP}
                        disabled={isLoading || resendCooldown > 0}
                      >
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : t("signUp.resend")}
                      </Button>
                    </div>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSignupStep(2);
                          setOtpCode("");
                        }}
                        disabled={isLoading}
                      >
                        {/* ← Back to Profile */}
                        {t("signUp.backToProfile")}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
        </div>
      )}
    </div>
  );
};

export default Auth;
