import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import { TicketTypeSelection } from "./TicketTypeSelection";
import { PersonalInfoStep } from "./PersonalInfoStep";
import { PaymentStep } from "./PaymentStep";
import { TimeoutDialog } from "./TimeoutDialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface TicketSelectionFlowProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketSelectionFlow({
  event,
  open,
  onOpenChange,
}: TicketSelectionFlowProps) {
  const { t, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<any[]>([]);
  const [personalInfo, setPersonalInfo] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [isMobile, setIsMobile] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [currentStep]);

  // ✅ Detect mobile once when component mounts
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (open) {
      fetchTicketTypes();
      // Reset semua state ke awal saat dialog dibuka
      const expiryMinutes = event?.payment_expiry_minutes ?? 2;
      const initialSeconds = expiryMinutes * 60;
      setTimeRemaining(initialSeconds);
      setCurrentStep(1);
      setSelectedTickets([]);
      setPersonalInfo([]);
      setShowTimeoutDialog(false);
    }
  }, [open, event.id]);

  useEffect(() => {
    // Timer hanya jalan jika:
    // 1. Dialog utama terbuka (open)
    // 2. Dialog timeout TIDAK sedang tampil (!showTimeoutDialog)
    // 3. Masih ada sisa waktu (timeRemaining > 0)
    if (open && !showTimeoutDialog && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);

      // Bersihkan interval
      return () => clearInterval(timer);
    }

    // Jika waktu habis (<= 0), tampilkan dialog timeout
    else if (open && !showTimeoutDialog && timeRemaining <= 0) {
      setShowTimeoutDialog(true);
    }
  }, [open, timeRemaining, showTimeoutDialog]);

  const fetchTicketTypes = async () => {
    const { data, error } = await supabase
      .from("event_ticket_types")
      .select(
        `
        *,
        event_ticket_categories (*)
      `
      )
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (!error && data) setTicketTypes(data);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleReturnToCategory = () => {
    setShowTimeoutDialog(false);
    setCurrentStep(1);
    setSelectedTickets([]);
    setPersonalInfo([]);
    setTimeRemaining(120);
  };

  const checkQuotaAvailability = async () => {
    const categoryIds = selectedTickets.map((t) => t.categoryId);
    const { data, error } = await supabase
      .from("event_ticket_categories")
      .select("id, name, remaining_quota")
      .in("id", categoryIds);

    if (error || !data) return false;

    const unavailableCategories = data.filter((cat) => {
      const selected = selectedTickets.find((t) => t.categoryId === cat.id);
      return (
        selected &&
        (cat.remaining_quota === null ||
          cat.remaining_quota < selected.quantity)
      );
    });

    if (unavailableCategories.length > 0) {
      const categoryNames = unavailableCategories
        .map((cat) => cat.name)
        .join(", ");

      toast({
        title:
          language === "id"
            ? "Kategori Tidak Tersedia"
            : "Category Unavailable",
        description:
          language === "id"
            ? `Maaf, kategori berikut tidak tersedia lagi: ${categoryNames}. Silakan pilih kategori lain.`
            : `Sorry, the following categories are no longer available: ${categoryNames}. Please select other categories.`,
        variant: "destructive",
      });

      setCurrentStep(1);
      return false;
    }

    return true;
  };

  const handleProceedToPayment = async () => {
    const isAvailable = await checkQuotaAvailability();
    if (isAvailable) {
      setCurrentStep(3);
    }
  };

  // Check if all selected tickets are free
  const isFreeEvent = selectedTickets.every(ticket => ticket.category?.price === 0);

  const stepTitles = [
    t("eventRegistration.selectCategory"),
    t("eventRegistration.personalInfo"),
    t("eventRegistration.confirmation"),
    t("eventRegistration.payment"),
  ];

  return (
    <>
      <TimeoutDialog
        open={showTimeoutDialog}
        onReturnToCategory={handleReturnToCategory}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={scrollContainerRef}
          className={`
          w-full max-w-6xl 
          overflow-y-auto 
          p-0 
          shadow-2xl 
          bg-gradient-to-br 
          from-white/80 to-gray-50 
          dark:from-zinc-900/80 dark:to-zinc-800/90 
          backdrop-blur-xl
          transition-all
          ${isMobile ? "h-[100dvh] rounded-none" : "max-h-[90vh] rounded-2xl"}
        `}
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {/* HEADER STEP NAVIGATION */}
          <div className="sticky top-0 z-10 border-b border-border/40 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-lg px-6 md:px-10 py-4 md:py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Step Indicators */}
              <div className="flex items-center justify-center gap-6 md:gap-10 mx-auto md:mx-0">
                {[
                  {
                    id: 1,
                    label:
                      language === "id" ? "Pilih Kategori" : "Select Category",
                  },
                  {
                    id: 2,
                    label: language === "id" ? "Data Diri" : "Personal Info",
                  },
                  {
                    id: 3,
                    label: language === "id" ? "Konfirmasi" : "Confirmation",
                  },
                  ...(!isFreeEvent ? [{
                    id: 4,
                    label: language === "id" ? "Pembayaran" : "Payment",
                  }] : []),
                ].map((step) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full border-2 font-semibold transition-all duration-300 ${
                        currentStep === step.id
                          ? "border-primary bg-primary text-white shadow-md scale-105"
                          : currentStep > step.id
                          ? "border-primary/70 bg-primary/20 text-primary"
                          : "border-muted text-muted-foreground"
                      }`}
                    >
                      {step.id}
                    </div>
                    <p
                      className={`text-xs mt-1.5 ${
                        currentStep === step.id
                          ? "text-foreground font-medium"
                          : currentStep > step.id
                          ? "text-primary/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center md:justify-end gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-lg self-center md:self-auto">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono font-semibold">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Animated Steps */}
          <div className="p-4 md:p-6 min-h-[500px] pb-20 md:pb-10">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <TicketTypeSelection
                    event={event}
                    ticketTypes={ticketTypes}
                    selectedTickets={selectedTickets}
                    onTicketsChange={setSelectedTickets}
                    onNext={() => setCurrentStep(2)}
                  />
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <PersonalInfoStep
                    event={event}
                    selectedTickets={selectedTickets}
                    personalInfo={personalInfo}
                    onPersonalInfoChange={setPersonalInfo}
                    onNext={isFreeEvent ? setCurrentStep.bind(null, 3) : handleProceedToPayment}
                    onBack={() => setCurrentStep(1)}
                  />
                </motion.div>
              )}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <PaymentStep
                    event={event}
                    selectedTickets={selectedTickets}
                    personalInfo={personalInfo}
                    onBack={() => setCurrentStep(2)}
                    onClose={() => onOpenChange(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
