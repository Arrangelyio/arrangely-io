export const paymentInstructions = {
  en: {
    mandiri: {
      livin: {
        title: "Livin’ by Mandiri",
        steps: [
          "Select payment/VA on the main menu.",
          "Select e-commerce.",
          "Select Midtrans or type code 70012 in the service provider search bar.",
          "Input virtual account number in the payment code field.",
          "Click continue to confirm.",
          "Payment complete."
        ]
      },
      atm: {
        title: "ATM Mandiri",
        steps: [
          "Select pay/buy on the main menu.",
          "Select others.",
          "Select multi payment.",
          "Input Midtrans company code 70012.",
          "Input payment code, then confirm.",
          "Payment complete."
        ]
      },
      ib: {
        title: "Mandiri Internet Banking",
        steps: [
          "Select payment on the main menu.",
          "Select multi payment.",
          "Select from account.",
          "Select Midtrans in the service provider field.",
          "Input payment code, then confirm.",
          "Payment complete."
        ]
      },
      other: {
        title: "Via Other Banks",
        steps: [
          "Select your preferred bank & payment channel (ATM/internet/mobile banking).",
          "Select transfer to other bank.",
          "Input Mandiri virtual account number.",
          "Input the payable amount, then confirm.",
          "Payment complete."
        ]
      }
    },
    bni: {
      atm: {
        title: "ATM BNI",
        steps: [
          "Select others on the main menu.",
          "Select transfer.",
          "Select to BNI account.",
          "Insert the payment account number.",
          "Insert the payable amount, then confirm.",
          "Payment completed."
        ]
      },
      ib: {
        title: "Internet Banking",
        steps: [
          "Select transaction, then transfer administration info.",
          "Select set destination account.",
          "Insert account info, then confirm.",
          "Select transfer, then transfer to BNI account.",
          "Insert payment details, then confirm.",
          "Payment completed."
        ]
      },
      mb: {
        title: "Mobile Banking",
        steps: [
          "Select transfer.",
          "Select virtual account billing.",
          "Select the debit account you want to use.",
          "Insert the virtual account number, then confirm.",
          "Payment completed."
        ]
      },
      other: {
        title: "Via Other Bank",
        steps: [
          "Select your preferred bank & payment channel (ATM/internet/mobile banking).",
          "Select transfer to other bank.",
          "Input BNI virtual account number.",
          "Input the payable amount, then confirm.",
          "Payment complete."
        ]
      }
    },
    bri: {
      atm: {
        title: "ATM BRI",
        steps: [
          "Select other transactions on the main menu.",
          "Select payment.",
          "Select other.",
          "Select BRIVA.",
          "Insert BRIVA number, then confirm.",
          "Payment completed."
        ]
      },
      ib: {
        title: "Internet Banking BRI",
        steps: [
          "Select payment & purchase.",
          "Select BRIVA.",
          "Insert BRIVA Number, then confirm.",
          "Payment completed."
        ]
      },
      brimo: {
        title: "BRImo",
        steps: [
          "Select payment.",
          "Select BRIVA.",
          "Insert BRIVA number, then confirm.",
          "Payment completed."
        ]
      },
      other: {
        title: "Via Other Banks",
        steps: [
          "Select your preferred bank & payment channel (ATM/internet/mobile banking).",
          "Select transfer to other bank.",
          "Input BRIVA number.",
          "Input the payable amount, then confirm.",
          "Payment complete."
        ]
      }
    },
    permata: {
      atm: {
        title: "ATM Permata / ALTO",
        steps: [
          "Select other transactions on the main menu.",
          "Select payment.",
          "Select other payments.",
          "Select virtual account.",
          "Insert virtual account number, then confirm.",
          "Payment completed."
        ]
      },
      other: {
        title: "Via Other Banks",
        steps: [
          "Select your preferred bank & payment channel (ATM/internet/mobile banking).",
          "Select transfer to other bank.",
          "Input virtual account number.",
          "Input the payable amount, then confirm.",
          "Payment complete."
        ]
      }
    },
    cimb: {
      atm: {
        title: "ATM CIMB Niaga",
        steps: [
          "Select bill payment menu.",
          "Select virtual account.",
          "Input virtual account number, then confirm.",
          "Payment completed."
        ]
      },
      octoClicks: {
        title: "OCTO Clicks",
        steps: [
          "Select bill payment menu.",
          "Select mobile virtual account.",
          "Input virtual account number, then click continue to verify details.",
          "Select send OTP to proceed.",
          "Input OTP sent to your mobile number, then confirm.",
          "Payment completed."
        ]
      },
      octoMobile: {
        title: "OCTO Mobile",
        steps: [
          "Select transfer menu.",
          "Select transfer to other CIMB Niaga account.",
          "Select your source account: CASA or rekening ponsel.",
          "Input the virtual account number.",
          "Input the payable amount.",
          "Follow the instructions to complete the payment.",
          "Payment completed."
        ]
      },
      other: {
        title: "Via Other Banks",
        steps: [
          "Select your preferred bank & payment channel (ATM/internet/mobile banking).",
          "Select transfer to other bank.",
          "Input CIMB Niaga virtual account number.",
          "Input the payable amount, then confirm.",
          "Payment complete."
        ]
      }
    },
    otherBanks: {
      prima: {
        title: "PRIMA",
        steps: [
          "Select other transactions on the main menu.",
          "Select transfer.",
          "Select other bank account.",
          "Insert 009 as the bank code.",
          "Insert the payable amount.",
          "Insert the payment account number, then confirm.",
          "Payment completed."
        ]
      },
      atmBersama: {
        title: "ATM Bersama",
        steps: [
          "Select other transactions on the main menu.",
          "Select transfer.",
          "Select between online banks.",
          "Insert 009 as the bank code.",
          "Insert the payable amount.",
          "Insert the payment account number, then confirm.",
          "Payment completed."
        ]
      },
      alto: {
        title: "ALTO",
        steps: [
          "Select other transaction on the main menu.",
          "Select transfer.",
          "Select other bank account.",
          "Insert 009 as the bank code.",
          "Insert the payable amount.",
          "Insert the payment account number, then confirm.",
          "Payment completed."
        ]
      }
    },
    gopay: {
      title: "GoPay",
      steps: [
        "Scan the QR code using your GoPay app.",
        "Verify payment details and amount.",
        "Enter your GoPay PIN to confirm.",
        "Wait for confirmation screen."
      ]
    },
    qris: {
      title: "QRIS",
      steps: [
        "Open your e-wallet (GoPay, OVO, DANA, ShopeePay, etc).",
        "Scan the displayed QR code.",
        "Confirm the payment details.",
        "Enter your PIN and complete the payment."
      ]
    },
    creditCard: {
      title: "Credit / Debit Card",
      steps: [
        "Enter your card details (number, expiry date, CVV).",
        "Verify with 3D Secure or OTP if required.",
        "Wait for confirmation screen."
      ]
    }
  },
  id: {
    mandiri: {
      livin: {
        title: "Livin’ by Mandiri",
        steps: [
          "Pilih pembayaran/VA pada menu utama.",
          "Pilih e-commerce.",
          "Pilih Midtrans atau ketik kode 70012 di kolom pencarian penyedia layanan.",
          "Masukkan nomor virtual account pada kolom kode pembayaran.",
          "Klik lanjut untuk konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      atm: {
        title: "ATM Mandiri",
        steps: [
          "Pilih menu bayar/beli pada menu utama.",
          "Pilih lainnya.",
          "Pilih multi payment.",
          "Masukkan kode perusahaan Midtrans 70012.",
          "Masukkan kode pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      ib: {
        title: "Mandiri Internet Banking",
        steps: [
          "Pilih menu pembayaran pada menu utama.",
          "Pilih multi payment.",
          "Pilih dari rekening yang akan digunakan.",
          "Pilih Midtrans pada kolom penyedia layanan.",
          "Masukkan kode pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      other: {
        title: "Melalui Bank Lain",
        steps: [
          "Pilih bank dan saluran pembayaran yang diinginkan (ATM/internet/mobile banking).",
          "Pilih transfer ke bank lain.",
          "Masukkan nomor virtual account Mandiri.",
          "Masukkan jumlah pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      }
    },
    bni: {
      atm: {
        title: "ATM BNI",
        steps: [
          "Pilih menu lainnya di menu utama.",
          "Pilih transfer.",
          "Pilih ke rekening BNI.",
          "Masukkan nomor rekening pembayaran.",
          "Masukkan jumlah pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      ib: {
        title: "Internet Banking",
        steps: [
          "Pilih transaksi, lalu informasi administrasi transfer.",
          "Pilih atur rekening tujuan.",
          "Masukkan informasi rekening, lalu konfirmasi.",
          "Pilih transfer, lalu transfer ke rekening BNI.",
          "Masukkan detail pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      mb: {
        title: "Mobile Banking",
        steps: [
          "Pilih transfer.",
          "Pilih tagihan virtual account.",
          "Pilih rekening debit yang ingin digunakan.",
          "Masukkan nomor virtual account, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      other: {
        title: "Melalui Bank Lain",
        steps: [
          "Pilih bank dan saluran pembayaran yang diinginkan (ATM/internet/mobile banking).",
          "Pilih transfer ke bank lain.",
          "Masukkan nomor virtual account BNI.",
          "Masukkan jumlah pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      }
    },
    bri: {
      atm: {
        title: "ATM BRI",
        steps: [
          "Pilih transaksi lain di menu utama.",
          "Pilih pembayaran.",
          "Pilih lainnya.",
          "Pilih BRIVA.",
          "Masukkan nomor BRIVA, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      ib: {
        title: "Internet Banking BRI",
        steps: [
          "Pilih pembayaran & pembelian.",
          "Pilih BRIVA.",
          "Masukkan nomor BRIVA, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      brimo: {
        title: "BRImo",
        steps: [
          "Pilih pembayaran.",
          "Pilih BRIVA.",
          "Masukkan nomor BRIVA, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      other: {
        title: "Melalui Bank Lain",
        steps: [
          "Pilih bank dan saluran pembayaran yang diinginkan (ATM/internet/mobile banking).",
          "Pilih transfer ke bank lain.",
          "Masukkan nomor BRIVA.",
          "Masukkan jumlah pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      }
    },
    permata: {
      atm: {
        title: "ATM Permata / ALTO",
        steps: [
          "Pilih menu lainnya di menu utama.",
          "Pilih pembayaran.",
          "Pilih pembayaran lainnya.",
          "Pilih virtual account.",
          "Masukkan nomor virtual account, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      other: {
        title: "Melalui Bank Lain",
        steps: [
          "Pilih bank dan saluran pembayaran yang diinginkan (ATM/internet/mobile banking).",
          "Pilih transfer ke bank lain.",
          "Masukkan nomor virtual account.",
          "Masukkan jumlah pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      }
    },
    cimb: {
      atm: {
        title: "ATM CIMB Niaga",
        steps: [
          "Pilih menu pembayaran tagihan.",
          "Pilih virtual account.",
          "Masukkan nomor virtual account, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      octoClicks: {
        title: "OCTO Clicks",
        steps: [
          "Pilih menu pembayaran tagihan.",
          "Pilih mobile virtual account.",
          "Masukkan nomor virtual account, lalu klik lanjut untuk verifikasi.",
          "Pilih kirim OTP untuk melanjutkan.",
          "Masukkan OTP yang dikirim ke nomor ponsel Anda, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      octoMobile: {
        title: "OCTO Mobile",
        steps: [
          "Pilih menu transfer.",
          "Pilih transfer ke rekening CIMB Niaga lain.",
          "Pilih rekening sumber: CASA atau rekening ponsel.",
          "Masukkan nomor virtual account.",
          "Masukkan jumlah pembayaran.",
          "Ikuti instruksi untuk menyelesaikan pembayaran.",
          "Pembayaran selesai."
        ]
      },
      other: {
        title: "Melalui Bank Lain",
        steps: [
          "Pilih bank dan saluran pembayaran yang diinginkan (ATM/internet/mobile banking).",
          "Pilih transfer ke bank lain.",
          "Masukkan nomor virtual account CIMB Niaga.",
          "Masukkan jumlah pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      }
    },
    otherBanks: {
      prima: {
        title: "PRIMA",
        steps: [
          "Pilih menu lainnya di menu utama.",
          "Pilih transfer.",
          "Pilih rekening bank lain.",
          "Masukkan kode bank 009.",
          "Masukkan jumlah pembayaran.",
          "Masukkan nomor rekening pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      atmBersama: {
        title: "ATM Bersama",
        steps: [
          "Pilih menu lainnya di menu utama.",
          "Pilih transfer.",
          "Pilih antar bank online.",
          "Masukkan kode bank 009.",
          "Masukkan jumlah pembayaran.",
          "Masukkan nomor rekening pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      },
      alto: {
        title: "ALTO",
        steps: [
          "Pilih menu lainnya di menu utama.",
          "Pilih transfer.",
          "Pilih rekening bank lain.",
          "Masukkan kode bank 009.",
          "Masukkan jumlah pembayaran.",
          "Masukkan nomor rekening pembayaran, lalu konfirmasi.",
          "Pembayaran selesai."
        ]
      }
    },
    gopay: {
      title: "GoPay",
      steps: [
        "Scan kode QR menggunakan aplikasi GoPay Anda.",
        "Periksa detail dan jumlah pembayaran.",
        "Masukkan PIN GoPay Anda untuk konfirmasi.",
        "Tunggu layar konfirmasi berhasil."
      ]
    },
    qris: {
      title: "QRIS",
      steps: [
        "Buka e-wallet Anda (GoPay, OVO, DANA, ShopeePay, dll).",
        "Scan kode QR yang ditampilkan.",
        "Periksa detail pembayaran.",
        "Masukkan PIN Anda dan selesaikan pembayaran."
      ]
    },
    creditCard: {
      title: "Kartu Kredit / Debit",
      steps: [
        "Masukkan detail kartu Anda (nomor, masa berlaku, CVV).",
        "Verifikasi dengan 3D Secure atau OTP jika diminta.",
        "Tunggu layar konfirmasi berhasil."
      ]
    }
  }
};

export const detectBankFromVA = (vaNumber: string): string => {
  if (!vaNumber) return "unknown";

  vaNumber = vaNumber.toString().trim();

  // Define known VA prefixes mapped to banks that exist in paymentInstructions
  const bankPrefixes: Record<string, string[]> = {
    bni: ["988", "8"],
    bri: ["88", "26"],
    permata: ["850", "895"],
    cimb: ["70"],
    mandiri: ["886", "887", "888", "889"],
    bca: ["1", "112", "122"]
  };

  // Iterate through banks from paymentInstructions to ensure only defined ones are returned
  const availableBanks = Object.keys(paymentInstructions.en);

  for (const [bank, prefixes] of Object.entries(bankPrefixes)) {
    if (availableBanks.includes(bank)) {
      for (const prefix of prefixes) {
        if (vaNumber.startsWith(prefix)) {
          return bank;
        }
      }
    }
  }

  return "unknown";
};
