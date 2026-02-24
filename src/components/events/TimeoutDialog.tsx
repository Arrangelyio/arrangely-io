import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import timeoutImage from "@/assets/timeout-referee.png";

interface TimeoutDialogProps {
  open: boolean;
  onReturnToCategory: () => void;
}

export function TimeoutDialog({
  open,
  onReturnToCategory,
}: TimeoutDialogProps) {
  const { language } = useLanguage();

  return (
    // 🔽 PERBAIKAN DI BARIS INI 🔽
    <Dialog open={open} onOpenChange={onReturnToCategory}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center gap-6 py-4">
          <img src={timeoutImage} alt="Time's up" className="w-64 h-auto" />

          <p className="text-center text-foreground">
            {language === "id"
              ? "Maaf, waktu kamu untuk menyelesaikan transaksi ini telah habis. Silakan membeli tiket kembali."
              : "Sorry, your time to complete this transaction has expired. Please purchase tickets again."}
          </p>

          <Button onClick={onReturnToCategory} className="w-full">
            {language === "id"
              ? "Kembali ke halaman Pilih Kategori"
              : "Return to Category Selection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
