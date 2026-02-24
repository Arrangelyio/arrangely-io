import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EventTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "en" | "id";
}

const EventTermsModal = ({
  isOpen,
  onClose,
  language,
}: EventTermsModalProps) => {
  const content = {
    en: {
      title: "Arrangely Event Terms & Conditions and Privacy Policy",
      sections: [
        {
          heading: "Event Registration Terms",
          items: [
            "By registering for an event, you agree to provide accurate and complete information.",
            "Event organizers reserve the right to refuse entry or cancel registrations that violate event policies.",
            "Tickets are non-transferable unless explicitly stated by the event organizer.",
            "You are responsible for checking event details including date, time, venue, and any requirements.",
          ],
        },
        {
          heading: "Payment and Refunds",
          items: [
            "All payments are processed securely through our payment partners.",
            "Refund policies are determined by individual event organizers.",
            "Processing fees may be non-refundable.",
            "You will receive a confirmation email after successful registration.",
          ],
        },
        {
          heading: "Event Changes and Cancellations",
          items: [
            "Event organizers may modify event details with advance notice.",
            "In case of cancellation, refund procedures will be communicated via email.",
            "Arrangely is not responsible for changes made by event organizers.",
          ],
        },
        {
          heading: "Privacy and Data Usage",
          items: [
            "Your personal information is collected for event registration purposes.",
            "Data is shared with event organizers to facilitate your participation.",
            "We implement industry-standard security measures to protect your data.",
            "You have the right to access, modify, or delete your personal information.",
          ],
        },
        {
          heading: "Liability",
          items: [
            "Arrangely acts as a platform connecting users with event organizers.",
            "Event organizers are solely responsible for event execution and safety.",
            "Arrangely is not liable for any injuries, losses, or damages during events.",
          ],
        },
      ],
    },
    id: {
      title: "Syarat & Ketentuan dan Kebijakan Privasi Event Arrangely",
      sections: [
        {
          heading: "Ketentuan Pendaftaran Event",
          items: [
            "Dengan mendaftar untuk sebuah event, Anda setuju untuk memberikan informasi yang akurat dan lengkap.",
            "Penyelenggara event berhak menolak masuk atau membatalkan pendaftaran yang melanggar kebijakan event.",
            "Tiket tidak dapat dipindahtangankan kecuali dinyatakan secara eksplisit oleh penyelenggara event.",
            "Anda bertanggung jawab untuk memeriksa detail event termasuk tanggal, waktu, tempat, dan persyaratan lainnya.",
          ],
        },
        {
          heading: "Pembayaran dan Pengembalian Dana",
          items: [
            "Semua pembayaran diproses dengan aman melalui mitra pembayaran kami.",
            "Kebijakan pengembalian dana ditentukan oleh penyelenggara event masing-masing.",
            "Biaya pemrosesan mungkin tidak dapat dikembalikan.",
            "Anda akan menerima email konfirmasi setelah pendaftaran berhasil.",
          ],
        },
        {
          heading: "Perubahan dan Pembatalan Event",
          items: [
            "Penyelenggara event dapat mengubah detail event dengan pemberitahuan terlebih dahulu.",
            "Dalam hal pembatalan, prosedur pengembalian dana akan dikomunikasikan melalui email.",
            "Arrangely tidak bertanggung jawab atas perubahan yang dibuat oleh penyelenggara event.",
          ],
        },
        {
          heading: "Privasi dan Penggunaan Data",
          items: [
            "Informasi pribadi Anda dikumpulkan untuk keperluan pendaftaran event.",
            "Data dibagikan kepada penyelenggara event untuk memfasilitasi partisipasi Anda.",
            "Kami menerapkan langkah-langkah keamanan standar industri untuk melindungi data Anda.",
            "Anda memiliki hak untuk mengakses, mengubah, atau menghapus informasi pribadi Anda.",
          ],
        },
        {
          heading: "Tanggung Jawab",
          items: [
            "Arrangely bertindak sebagai platform yang menghubungkan pengguna dengan penyelenggara event.",
            "Penyelenggara event sepenuhnya bertanggung jawab atas pelaksanaan dan keamanan event.",
            "Arrangely tidak bertanggung jawab atas cedera, kerugian, atau kerusakan yang terjadi selama event.",
          ],
        },
      ],
    },
  };

  const currentContent = content[language];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{currentContent.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-6">
            {currentContent.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="font-semibold text-lg">{section.heading}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-sm text-muted-foreground pl-4">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground">
                {language === "en"
                  ? "By continuing with your registration, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions."
                  : "Dengan melanjutkan pendaftaran Anda, Anda mengakui bahwa Anda telah membaca, memahami, dan setuju untuk terikat dengan syarat dan ketentuan ini."}
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            {language === "en" ? "Close" : "Tutup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventTermsModal;
