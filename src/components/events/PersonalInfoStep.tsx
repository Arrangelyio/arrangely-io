import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryCodes } from "@/constants/locations";
import EventTermsModal from "@/components/legal/EventTermsModal";
import DataProcessingModal from "@/components/legal/DataProcessingModal";
import { EventAuthForm } from "./EventAuthForm";

interface PersonalInfoStepProps {
  event: any;
  selectedTickets: any[];
  personalInfo: any[];
  onPersonalInfoChange: (info: any[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PersonalInfoStep({
  event,
  selectedTickets,
  personalInfo,
  onPersonalInfoChange,
  onNext,
  onBack,
}: PersonalInfoStepProps) {
  const { t, language } = useLanguage();
  const { user } = useUserRole();
  const { toast } = useToast();
  const [formData, setFormData] = useState<any[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+62");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const totalTickets = selectedTickets.reduce(
    (sum, ticket) => sum + ticket.quantity,
    0
  );

  // Check if event is free (total ticket price is 0) - must be before useEffects
  const isFreeEvent = selectedTickets.every(ticket => ticket.category.price === 0);

  // Check authentication state
  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  // Listen for auth state changes (e.g., after Google login redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && !user) {
          // User just logged in, check if already registered for free event
          if (isFreeEvent) {
            const { data: existingReg } = await supabase
              .from("event_registrations")
              .select("id, booking_id")
              .eq("event_id", event.id)
              .eq("user_id", session.user.id)
              .eq("payment_status", "free")
              .maybeSingle();

            if (existingReg) {
              // Already registered, close popup and refresh
              toast({
                title: language === "id" ? "Sudah Terdaftar" : "Already Registered",
                description:
                  language === "id"
                    ? "Anda sudah terdaftar untuk event ini"
                    : "You are already registered for this event",
              });
              window.location.reload();
              return;
            }
          }

          // Not registered or not free event, proceed with form
          await handleAuthSuccess();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [user, isFreeEvent, event.id, language]);

  // Initialize form with user profile
  useEffect(() => {
    const initializeFormData = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email, phone_number")
          .eq("user_id", user.id)
          .single();

        const baseInfo = {
          participant_name: profile?.display_name || "",
          participant_email: profile?.email || user?.email || "",
          participant_phone: profile?.phone_number?.replace(/^\+?\d{1,3}/, "") || "",
          participant_ktp: "",
        };

        // Extract the country code if exists
        const matchedCode = countryCodes.find(code =>
          profile?.phone_number?.startsWith(code.value)
        );
        if (matchedCode) setSelectedCountryCode(matchedCode.value);

        const initialData = Array.from({ length: totalTickets }, () => baseInfo);
        setFormData(initialData);
        onPersonalInfoChange(initialData);
      } catch (error) {
        console.error("Error initializing form:", error);
      }
    };

    initializeFormData();
  }, [user, totalTickets]);

  const handleAuthSuccess = async () => {
    setIsAuthenticated(true);

    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      // Check if already registered for free event (case 2)
      if (isFreeEvent) {
        const { data: existingReg } = await supabase
          .from("event_registrations")
          .select("id, booking_id")
          .eq("event_id", event.id)
          .eq("user_id", newUser.id)
          .eq("payment_status", "free")
          .maybeSingle();

        if (existingReg) {
          toast({
            title: language === "id" ? "Sudah Terdaftar" : "Already Registered",
            description:
              language === "id"
                ? "Anda sudah terdaftar untuk event ini. Halaman akan dimuat ulang."
                : "You are already registered for this event. Page will refresh.",
          });
          // Close popup and refresh after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return;
        }
      }

      // Not registered, pre-fill form with user data (case 1)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", newUser.id)
        .single();

      if (profile) {
        const baseInfo = {
          participant_name: profile.display_name || "",
          participant_email: profile.email || newUser.email || "",
          participant_phone: profile.phone_number?.replace(/^\+?\d{1,3}/, "") || "",
          participant_ktp: "",
        };

        const matchedCode = countryCodes.find(code =>
          profile?.phone_number?.startsWith(code.value)
        );
        if (matchedCode) setSelectedCountryCode(matchedCode.value);

        const initialData = Array.from({ length: totalTickets }, () => baseInfo);
        setFormData(initialData);
        onPersonalInfoChange(initialData);
      }
    }

    toast({
      title: language === "id" ? "Login Berhasil" : "Login Successful",
      description:
        language === "id"
          ? "Silakan lengkapi informasi tiket Anda"
          : "Please complete your ticket information",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    const firstData = formData[0] || {};
    const updatedData = { ...firstData, [field]: value };
    const newData = Array.from({ length: totalTickets }, () => updatedData);
    setFormData(newData);
    onPersonalInfoChange(newData);
  };

  const isFormValid = () => {
    const first = formData[0] || {};
    // KTP is optional for free events
    if (isFreeEvent) {
      return (
        first.participant_name &&
        first.participant_email &&
        first.participant_phone
      );
    }
    return (
      first.participant_name &&
      first.participant_email &&
      first.participant_phone &&
      first.participant_ktp
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-[#0A2A66]">
      {/* Left side - Auth or Form */}
      <div className="lg:col-span-2 space-y-6">
        {!isAuthenticated ? (
          <EventAuthForm
            onAuthSuccess={handleAuthSuccess}
            event={event}
            language={language}
          />
        ) : (
          <>
            {!isFreeEvent && (
              <Alert
                variant="default"
                className="bg-[#EFF6FF] border border-[#2E67F8]/40 rounded-xl shadow-sm"
              >
                <AlertCircle className="h-4 w-4 text-[#2E67F8]" />
                <div>
                  <AlertTitle className="text-[#0A2A66] font-semibold">
                    {t("eventRegistration.idRequirementTitle")}
                  </AlertTitle>
                  <AlertDescription className="text-[#0A2A66]/80">
                    {t("eventRegistration.idRequirementDesc")}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <h3 className="text-xl font-semibold text-[#0A2A66]">
              {t("eventRegistration.personalInfo")}
            </h3>

            <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition">
              <div className="mb-4">
                <p className="text-sm text-[#0A2A66]/70">
                  {language === "id"
                    ? `Informasi ini akan digunakan untuk semua ${totalTickets} tiket`
                    : `This information will be used for all ${totalTickets} tickets`}
                </p>
              </div>

              <div className="grid gap-4">
                {/* Full Name */}
                <div>
                  <Label htmlFor="name" className="text-[#0A2A66]">
                    {t("eventRegistration.fullName")} *
                  </Label>
                  <Input
                    id="name"
                    value={formData[0]?.participant_name || ""}
                    onChange={(e) =>
                      handleInputChange("participant_name", e.target.value)
                    }
                    placeholder={
                      language === "id"
                        ? "Masukkan nama lengkap sesuai KTP"
                        : "Enter full name as per ID"
                    }
                    className="rounded-lg border-gray-300 focus:border-[#2E67F8] focus:ring-[#2E67F8]/30"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-[#0A2A66]">
                    {t("eventRegistration.email")} *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData[0]?.participant_email || ""}
                    onChange={(e) =>
                      handleInputChange("participant_email", e.target.value)
                    }
                    placeholder="email@example.com"
                    className="rounded-lg border-gray-300 focus:border-[#2E67F8] focus:ring-[#2E67F8]/30"
                  />
                </div>

                {/* Phone Number with Country Code */}
                <div>
                  <Label htmlFor="phone" className="text-[#0A2A66]">
                    {t("eventRegistration.phone")} *
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedCountryCode}
                      onValueChange={setSelectedCountryCode}
                    >
                      <SelectTrigger className="w-[110px] rounded-lg">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countryCodes.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData[0]?.participant_phone || ""}
                      onChange={(e) =>
                        handleInputChange("participant_phone", e.target.value)
                      }
                      placeholder="Enter your phone number"
                      className="rounded-lg flex-1 border-gray-300 focus:border-[#2E67F8] focus:ring-[#2E67F8]/30"
                    />
                  </div>
                </div>

                {/* KTP / Passport - Optional for free events */}
                <div>
                  <Label htmlFor="ktp" className="text-[#0A2A66]">
                    {t("eventRegistration.idNumber")} {!isFreeEvent && "*"}
                  </Label>
                  <Input
                    id="ktp"
                    value={formData[0]?.participant_ktp || ""}
                    onChange={(e) =>
                      handleInputChange("participant_ktp", e.target.value)
                    }
                    placeholder={
                      language === "id"
                        ? "Nomor KTP/Passport"
                        : "ID/Passport Number"
                    }
                    required={!isFreeEvent}
                    className="rounded-lg border-gray-300 focus:border-[#2E67F8] focus:ring-[#2E67F8]/30"
                  />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Right side - Summary */}
      <div className="lg:col-span-1">
        {isAuthenticated && (
          <Card className="p-6 bg-[#0A2A66] text-white rounded-2xl shadow-lg sticky top-24">
            <h3 className="font-semibold mb-4 text-white">{event.title}</h3>

            <div className="space-y-4">
              {selectedTickets.map((ticket) => (
                <div key={ticket.categoryId} className="text-sm">
                  <p className="font-medium text-white">
                    {ticket.category.name}
                  </p>
                  <p className="text-gray-300">
                    {ticket.quantity}{" "}
                    {language === "id" ? "tiket" : "ticket"}
                    {ticket.quantity > 1 ? "s" : ""}
                  </p>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-600 space-y-4">
                <div className="space-y-3 text-xs text-gray-300">
                  <p>
                    {language === "id"
                      ? 'Dengan mengklik "Lanjut", kamu menyetujui '
                      : 'By clicking "Continue", you agree to '}
                    <button
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#2E67F8] hover:underline font-medium"
                    >
                      {language === "id"
                        ? "Syarat & Ketentuan dan Kebijakan Privasi Arrangely"
                        : "Arrangely's Terms & Conditions and Privacy Policy"}
                    </button>
                    .
                  </p>
                </div>

                <Button
                  onClick={onNext}
                  className="w-full bg-[#2E67F8] hover:bg-[#1E50D8] text-white font-semibold rounded-lg"
                  disabled={!isFormValid()}
                >
                  {t("eventRegistration.continue")}
                </Button>

                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full border-gray-300 text-[#0A2A66] hover:bg-gray-100 font-semibold rounded-lg"
                >
                  {t("eventRegistration.back")}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      <EventTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        language={language}
      />
      <DataProcessingModal
        isOpen={showDataModal}
        onClose={() => setShowDataModal(false)}
        language={language}
      />
    </div>
  );
}
