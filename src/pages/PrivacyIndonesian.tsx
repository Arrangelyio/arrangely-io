import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Users, FileText, Globe } from "lucide-react";

const PrivacyIndonesian = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Kebijakan Privasi</h1>
            <p className="text-xl text-muted-foreground">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Privasi Anda penting bagi kami. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Informasi yang Kami Kumpulkan</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Informasi Pribadi</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Informasi akun (nama, alamat email, detail profil)</li>
                    <li>Informasi profesional (peran musik, tingkat pengalaman)</li>
                    <li>Informasi kontak dan preferensi komunikasi</li>
                    <li>Informasi pembayaran (diproses dengan aman melalui pihak ketiga)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Konten Musik</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Aransemen lagu dan chord sheet yang Anda buat</li>
                    <li>Preferensi musik dan pilihan instrumen</li>
                    <li>Pola penggunaan dan interaksi platform</li>
                    <li>Data kolaborasi dengan pengguna lain</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Data Teknis</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Informasi perangkat dan jenis browser</li>
                    <li>Alamat IP dan data lokasi</li>
                    <li>Analitik penggunaan dan metrik kinerja</li>
                    <li>Cookie dan teknologi pelacakan serupa</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Bagaimana Kami Menggunakan Informasi Anda</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Penyediaan Layanan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Menyediakan dan memelihara layanan platform kami</li>
                    <li>Memproses aransemen Anda dan mengelola perpustakaan Anda</li>
                    <li>Mengaktifkan fitur kolaborasi dengan pengguna lain</li>
                    <li>Menangani penagihan berlangganan dan pembayaran</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Komunikasi</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Mengirim pembaruan layanan dan notifikasi</li>
                    <li>Memberikan dukungan pelanggan dan merespons pertanyaan</li>
                    <li>Berbagi pembaruan produk dan fitur baru</li>
                    <li>Mengirim komunikasi pemasaran (dengan persetujuan)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Peningkatan Platform</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Menganalisis pola penggunaan untuk meningkatkan layanan kami</li>
                    <li>Mengembangkan fitur baru berdasarkan kebutuhan pengguna</li>
                    <li>Memastikan keamanan platform dan mencegah penipuan</li>
                    <li>Mematuhi kewajiban hukum</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <span>Berbagi Informasi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Kami tidak menjual informasi pribadi Anda. Kami hanya dapat membagikan informasi Anda dalam keadaan berikut:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Dengan persetujuan eksplisit Anda</li>
                  <li>Dengan penyedia layanan yang membantu kami mengoperasikan platform</li>
                  <li>Ketika diwajibkan oleh hukum atau proses hukum</li>
                  <li>Untuk melindungi hak, properti, atau keselamatan kami</li>
                  <li>Sehubungan dengan transfer bisnis atau merger</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>Keamanan & Penyimpanan Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Kami menerapkan langkah-langkah keamanan standar industri untuk melindungi data Anda:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Enkripsi data dalam perjalanan dan saat disimpan</li>
                  <li>Audit keamanan dan pemantauan reguler</li>
                  <li>Kontrol akses dan sistem autentikasi</li>
                  <li>Infrastruktur cloud yang aman dengan penyedia terkemuka</li>
                  <li>Prosedur pencadangan dan pemulihan data</li>
                </ul>
                <div className="bg-muted/50 p-4 rounded-lg mt-4">
                  <p className="text-sm">
                    <strong>Retensi Data:</strong> Kami menyimpan data Anda selama akun Anda aktif 
                    atau seperlunya untuk menyediakan layanan. Anda dapat meminta penghapusan data kapan saja.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span>Hak Anda</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Sesuai dengan undang-undang perlindungan data yang berlaku, Anda memiliki hak berikut terkait data pribadi Anda:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li><strong>Akses:</strong> Meminta salinan data pribadi Anda</li>
                  <li><strong>Pembetulan:</strong> Memperbaiki data yang tidak akurat atau tidak lengkap</li>
                  <li><strong>Penghapusan:</strong> Meminta penghapusan data pribadi Anda</li>
                  <li><strong>Portabilitas:</strong> Menerima data Anda dalam format terstruktur</li>
                  <li><strong>Pembatasan:</strong> Membatasi cara kami memproses data Anda</li>
                  <li><strong>Keberatan:</strong> Menolak pemrosesan data untuk pemasaran</li>
                </ul>
                <div className="bg-accent-soft p-4 rounded-lg mt-4">
                  <p className="text-sm">
                    Untuk menggunakan hak-hak ini, hubungi kami di <strong>privacy@arrangely.io</strong>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cookie & Pelacakan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Kami menggunakan cookie dan teknologi serupa untuk meningkatkan pengalaman Anda:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li><strong>Cookie esensial:</strong> Diperlukan untuk fungsi platform</li>
                  <li><strong>Cookie analitik:</strong> Membantu kami memahami pola penggunaan</li>
                  <li><strong>Cookie preferensi:</strong> Mengingat pengaturan dan pilihan Anda</li>
                  <li><strong>Cookie pemasaran:</strong> Menampilkan iklan yang relevan (dengan persetujuan)</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Anda dapat mengelola preferensi cookie melalui pengaturan browser atau banner persetujuan cookie kami.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hubungi Kami</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini atau cara kami menangani data Anda:
                </p>
                 <div className="space-y-2">
                   <p><strong>Email:</strong> info@arrangely.io</p>
                   <p><strong>Dukungan:</strong> Kunjungi live chat kami atau formulir kontak</p>
                   <p><strong>Alamat Surat:</strong> RUKO GRAND ORCHARD, JALAN TERUSAN KELAPA HYBRIDA BLOK F 02, Desa/Kelurahan Sukapura, Kec. Cilincing, Kota Adm. Jakarta Utara, Provinsi DKI Jakarta, Kode Pos: 14140</p>
                 </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Pembaruan Kebijakan:</strong> Kami dapat memperbarui kebijakan ini secara berkala. 
                    Kami akan memberi tahu Anda tentang perubahan signifikan melalui email atau notifikasi platform.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyIndonesian;