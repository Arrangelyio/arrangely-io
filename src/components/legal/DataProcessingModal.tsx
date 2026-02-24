import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "en" | "id";
}

const DataProcessingModal = ({
  isOpen,
  onClose,
  language,
}: DataProcessingModalProps) => {
  const content = {
    en: {
      title: "Arrangely Personal Data Processing Policy for Events",
      sections: [
        {
          heading: "Data We Collect",
          items: [
            "Full name as per identification document",
            "Email address for communication and ticket delivery",
            "Phone number for important event updates",
            "ID/Passport number (optional, if required by event organizer)",
            "Payment information (processed securely by third-party payment providers)",
          ],
        },
        {
          heading: "How We Use Your Data",
          items: [
            "To process your event registration and ticket issuance",
            "To communicate event details, updates, and important information",
            "To share necessary information with event organizers for event management",
            "To send you confirmation emails and digital tickets",
            "To comply with legal and regulatory requirements",
            "To improve our services and user experience",
          ],
        },
        {
          heading: "Data Sharing",
          items: [
            "Event organizers: We share your registration information with the event organizer you're registering for.",
            "Payment processors: Payment information is handled by secure third-party payment providers.",
            "Legal authorities: We may disclose information when required by law.",
            "We do not sell your personal data to third parties for marketing purposes.",
          ],
        },
        {
          heading: "Data Security",
          items: [
            "We use industry-standard encryption to protect data transmission.",
            "Personal data is stored on secure servers with restricted access.",
            "Regular security audits are conducted to maintain data protection.",
            "Payment information is never stored on our servers.",
          ],
        },
        {
          heading: "Your Rights",
          items: [
            "Access: You can request a copy of your personal data.",
            "Correction: You can update or correct inaccurate information.",
            "Deletion: You can request deletion of your data (subject to legal retention requirements).",
            "Objection: You can object to certain types of data processing.",
            "Data Portability: You can request your data in a machine-readable format.",
          ],
        },
        {
          heading: "Data Retention",
          items: [
            "Event registration data is retained for 1 years for legal and accounting purposes.",
            "After this period, personal data will be anonymized or deleted.",
            "You can request earlier deletion of your data subject to legal requirements.",
          ],
        },
        {
          heading: "Contact Us",
          items: [
            "For any questions about data processing, please contact our Data Protection Officer.",
            "Email: info@arrangely.io",
            "We will respond to your inquiries within 30 days.",
          ],
        },
      ],
    },
    id: {
      title: "Kebijakan Pemrosesan Data Pribadi Arrangely untuk Event",
      sections: [
        {
          heading: "Data yang Kami Kumpulkan",
          items: [
            "Nama lengkap sesuai dokumen identifikasi",
            "Alamat email untuk komunikasi dan pengiriman tiket",
            "Nomor telepon untuk pembaruan penting terkait event",
            "Nomor KTP/Passport (opsional, jika diperlukan oleh penyelenggara event)",
            "Informasi pembayaran (diproses dengan aman oleh penyedia pembayaran pihak ketiga)",
          ],
        },
        {
          heading: "Bagaimana Kami Menggunakan Data Anda",
          items: [
            "Untuk memproses pendaftaran event dan penerbitan tiket Anda",
            "Untuk mengkomunikasikan detail event, pembaruan, dan informasi penting",
            "Untuk membagikan informasi yang diperlukan kepada penyelenggara event untuk manajemen event",
            "Untuk mengirimkan email konfirmasi dan tiket digital",
            "Untuk mematuhi persyaratan hukum dan peraturan",
            "Untuk meningkatkan layanan dan pengalaman pengguna kami",
          ],
        },
        {
          heading: "Pembagian Data",
          items: [
            "Penyelenggara event: Kami membagikan informasi pendaftaran Anda kepada penyelenggara event yang Anda daftarkan.",
            "Pemroses pembayaran: Informasi pembayaran ditangani oleh penyedia pembayaran pihak ketiga yang aman.",
            "Otoritas hukum: Kami dapat mengungkapkan informasi jika diwajibkan oleh hukum.",
            "Kami tidak menjual data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran.",
          ],
        },
        {
          heading: "Keamanan Data",
          items: [
            "Kami menggunakan enkripsi standar industri untuk melindungi transmisi data.",
            "Data pribadi disimpan di server aman dengan akses terbatas.",
            "Audit keamanan rutin dilakukan untuk menjaga perlindungan data.",
            "Informasi pembayaran tidak pernah disimpan di server kami.",
          ],
        },
        {
          heading: "Hak Anda",
          items: [
            "Akses: Anda dapat meminta salinan data pribadi Anda.",
            "Koreksi: Anda dapat memperbarui atau memperbaiki informasi yang tidak akurat.",
            "Penghapusan: Anda dapat meminta penghapusan data Anda (tunduk pada persyaratan penyimpanan hukum).",
            "Keberatan: Anda dapat keberatan terhadap jenis pemrosesan data tertentu.",
            "Portabilitas Data: Anda dapat meminta data Anda dalam format yang dapat dibaca mesin.",
          ],
        },
        {
          heading: "Penyimpanan Data",
          items: [
            "Data pendaftaran event disimpan selama 5 tahun untuk keperluan hukum dan akuntansi.",
            "Setelah periode ini, data pribadi akan dianonimkan atau dihapus.",
            "Anda dapat meminta penghapusan data Anda lebih awal sesuai dengan persyaratan hukum.",
          ],
        },
        {
          heading: "Hubungi Kami",
          items: [
            "Untuk pertanyaan tentang pemrosesan data, silakan hubungi Petugas Perlindungan Data kami.",
            "Email: info@arrangely.io",
            "Kami akan menanggapi pertanyaan Anda dalam 30 hari.",
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
                  ? "By continuing, you consent to the processing of your personal data as described in this policy for the purpose of event registration and participation."
                  : "Dengan melanjutkan, Anda menyetujui pemrosesan data pribadi Anda seperti yang dijelaskan dalam kebijakan ini untuk tujuan pendaftaran dan partisipasi event."}
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

export default DataProcessingModal;
