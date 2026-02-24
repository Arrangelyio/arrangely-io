import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, Music, CreditCard, Users, AlertTriangle } from "lucide-react";

const TermsIndonesian = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Syarat & Ketentuan</h1>
            <p className="text-xl text-muted-foreground">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Harap baca syarat dan ketentuan ini dengan cermat sebelum menggunakan platform kami.
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Penerimaan Syarat</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Dengan mengakses dan menggunakan Arrangely ("kami," "milik kami," atau "platform"), 
                  Anda ("Anda" atau "pengguna") menerima dan setuju untuk terikat oleh Syarat & Ketentuan ini. 
                  Jika Anda tidak setuju dengan syarat ini, harap jangan gunakan platform kami.
                </p>
                <div className="bg-accent-soft p-4 rounded-lg">
                  <p className="text-sm font-medium">
                    <strong>Persyaratan Usia:</strong> Platform ini dapat digunakan oleh siswa SD, SMP, SMA, dan dewasa. Pengguna di bawah 18 tahun memerlukan persetujuan orang tua atau wali.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Akun Pengguna & Tanggung Jawab</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Pembuatan Akun</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Berikan informasi yang akurat, lengkap, dan terkini</li>
                    <li>Jaga keamanan kredensial akun Anda</li>
                    <li>Beri tahu kami segera jika ada akses tidak sah</li>
                    <li>Anda bertanggung jawab atas semua aktivitas di akun Anda</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Penggunaan yang Dapat Diterima</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Gunakan platform hanya untuk tujuan yang sah</li>
                    <li>Hormati pengguna lain dan pertahankan perilaku profesional</li>
                    <li>Jangan mengunggah konten berbahaya atau mencoba merusak keamanan</li>
                    <li>Ikuti pedoman komunitas dan hukum hak cipta</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Music className="h-5 w-5 text-primary" />
                  <span>Kekayaan Intelektual & Konten</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Konten Anda</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Anda mempertahankan kepemilikan atas aransemen musik asli Anda</li>
                    <li>Anda harus memiliki hak/lisensi yang tepat untuk materi berhak cipta</li>
                    <li>Anda memberikan kami lisensi untuk menyimpan, menampilkan, dan mendistribusikan konten Anda</li>
                    <li>Anda dapat menghapus konten Anda kapan saja</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Kepatuhan Hak Cipta</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Hormati hak cipta penulis lagu dan penerbit</li>
                    <li>Hanya bagikan aransemen yang Anda miliki hak untuk didistribusikan</li>
                    <li>Kami merespons permintaan takedown DMCA yang valid</li>
                    <li>Pelanggaran berulang dapat menyebabkan penghentian akun</li>
                  </ul>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Penting:</strong> Membuat chord chart tidak memberikan Anda hak cipta atas lagu yang mendasarinya. 
                    Selalu pastikan Anda memiliki lisensi yang tepat untuk pertunjukan publik atau distribusi.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>Syarat Berlangganan & Pembayaran</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Paket Berlangganan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Kami menawarkan berbagai tingkat berlangganan dengan fitur yang berbeda</li>
                    <li>Berlangganan diperpanjang otomatis kecuali dibatalkan</li>
                    <li>Anda dapat meningkatkan, menurunkan, atau membatalkan kapan saja</li>
                    <li>Perubahan berlaku pada siklus penagihan berikutnya</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Penagihan & Pengembalian Dana</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Semua pembayaran diproses dengan aman melalui penyedia pihak ketiga</li>
                    <li>Harga dapat berubah dengan pemberitahuan 30 hari</li>
                    <li>Pengembalian dana tersedia dalam 14 hari untuk berlangganan tahunan</li>
                    <li>Pengembalian dana pro-rata untuk pembatalan awal mungkin berlaku</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Uji Coba Gratis</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Periode uji coba memungkinkan akses penuh ke fitur premium</li>
                    <li>Tidak ada biaya selama periode uji coba</li>
                    <li>Batalkan kapan saja sebelum uji coba berakhir untuk menghindari biaya</li>
                    <li>Uji coba terbatas satu per pengguna/metode pembayaran</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>Metode Pembayaran</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Arrangely menyediakan berbagai metode pembayaran yang diproses melalui 
                  penyedia pembayaran pihak ketiga yang aman dan tersertifikasi.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Metode yang Didukung</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Dompet digital (GoPay, GoPay Later, Dana)</li>
                    <li>QRIS</li>
                    <li>Virtual Account (BCA, BNI, Mandiri, dan bank lainnya)</li>
                    <li>Kartu kredit dan debit (Visa, Mastercard, JCB)</li>
                    <li>Metode pembayaran lain yang tersedia melalui mitra pembayaran kami</li>
                  </ul>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Penting:</strong> Seluruh transaksi pembayaran diproses oleh 
                    penyedia pembayaran pihak ketiga (seperti Midtrans). Arrangely tidak 
                    menyimpan data kartu atau kredensial pembayaran pengguna.
                  </p>
                </div>

                <div className="bg-accent-soft p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Platform iOS:</strong> Untuk pengguna aplikasi iOS, pembayaran 
                    dilakukan melalui sistem pembayaran eksternal yang aman. Arrangely 
                    tidak menggunakan sistem In-App Purchase Apple untuk transaksi ini.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Lisensi Platform & Pembatasan</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Yang Dapat Anda Lakukan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Membuat dan mengedit chord sheet dan aransemen</li>
                    <li>Berbagi aransemen dengan tim atau organisasi Anda</li>
                    <li>Mengekspor konten Anda dalam berbagai format</li>
                    <li>Berkolaborasi dengan pengguna lain dalam proyek</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Yang Tidak Dapat Anda Lakukan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Menyalin, memodifikasi, atau mendistribusikan kembali perangkat lunak kami</li>
                    <li>Melakukan reverse engineering atau mencoba mengekstrak kode sumber</li>
                    <li>Menggunakan alat otomatis untuk mengambil atau mengumpulkan data</li>
                    <li>Menghapus hak cipta atau pemberitahuan kepemilikan</li>
                    <li>Menjual akses ke platform atau menjual kembali layanan kami</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Komunitas & Program Kreator</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Pedoman Komunitas</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Bersikap hormat dan profesional dalam semua interaksi</li>
                    <li>Bagikan aransemen berkualitas tinggi dan akurat</li>
                    <li>Berikan umpan balik konstruktif kepada kreator lain</li>
                    <li>Laporkan konten atau perilaku yang tidak pantas</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Manfaat Kreator</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Dapatkan manfaat ketika pengguna menambahkan aransemen Anda ke perpustakaan mereka</li>
                    <li>Terima pengakuan untuk kontribusi berkualitas tinggi</li>
                    <li>Akses alat dan fitur khusus kreator</li>
                    <li>Berpartisipasi dalam program rujukan dan diskon kami</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <span>Pembatasan Tanggung Jawab</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Sejauh diizinkan oleh hukum, Arrangely dan afiliasinya tidak bertanggung jawab atas:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Kerusakan tidak langsung, insidental, khusus, atau konsekuensial</li>
                  <li>Kehilangan keuntungan, data, atau peluang bisnis</li>
                  <li>Gangguan layanan atau kegagalan teknis</li>
                  <li>Tindakan pihak ketiga atau pengguna lain</li>
                  <li>Pelanggaran hak cipta oleh konten yang dibuat pengguna</li>
                </ul>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Ketersediaan Layanan:</strong> Kami berusaha untuk uptime 99,9% tetapi tidak dapat 
                    menjamin layanan tanpa gangguan. Pemeliharaan terjadwal akan diumumkan sebelumnya.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privasi & Perlindungan Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Privasi Anda penting bagi kami. Kebijakan Privasi kami menjelaskan bagaimana kami 
                  mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda. Dengan menggunakan 
                  platform kami, Anda juga setuju dengan Kebijakan Privasi kami.
                </p>
                <div className="bg-accent-soft p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Kepatuhan Regulasi:</strong> Kami mematuhi peraturan perlindungan data yang berlaku. 
                    Pengguna memiliki hak tambahan terkait data pribadi mereka.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Penghentian & Penangguhan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Oleh Anda</h4>
                  <p className="text-muted-foreground text-sm">
                    Anda dapat menghentikan akun Anda kapan saja melalui pengaturan akun atau dengan menghubungi dukungan.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Oleh Kami</h4>
                  <p className="text-muted-foreground text-sm mb-2">
                    Kami dapat menangguhkan atau menghentikan akun karena:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground text-sm">
                    <li>Pelanggaran syarat ini atau pedoman komunitas</li>
                    <li>Pelanggaran hak cipta atau aktivitas ilegal</li>
                    <li>Tidak membayar biaya berlangganan</li>
                    <li>Penyalahgunaan fitur platform atau pengguna lain</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Perubahan Syarat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Kami dapat memperbarui Syarat & Ketentuan ini secara berkala. Kami akan memberi tahu 
                  pengguna tentang perubahan signifikan melalui email atau notifikasi platform setidaknya 
                  30 hari sebelum berlaku.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Penggunaan Berkelanjutan:</strong> Penggunaan platform Anda yang berkelanjutan 
                    setelah perubahan berlaku merupakan penerimaan syarat baru.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informasi Kontak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Jika Anda memiliki pertanyaan tentang Syarat & Ketentuan ini:
                </p>
                 <div className="space-y-2">
                   <p><strong>Email:</strong> info@arrangely.io</p>
                   <p><strong>Dukungan:</strong> info@arrangely.io</p>
                   <p><strong>Pertanyaan Umum:</strong> info@arrangely.io</p>
                   <p><strong>Alamat Surat:</strong> RUKO GRAND ORCHARD, JALAN TERUSAN KELAPA HYBRIDA BLOK F 02, Desa/Kelurahan Sukapura, Kec. Cilincing, Kota Adm. Jakarta Utara, Provinsi DKI Jakarta, Kode Pos: 14140</p>
                 </div>
                <div className="bg-accent-soft p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Hukum yang Berlaku:</strong> Syarat ini diatur oleh hukum Indonesia. 
                    Setiap sengketa akan diselesaikan melalui mediasi atau pengadilan yang berwenang.
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

export default TermsIndonesian;