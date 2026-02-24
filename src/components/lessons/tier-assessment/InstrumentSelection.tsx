import { Piano, Guitar, Music, Drum, Wind, Mic } from "lucide-react";
import { motion } from "framer-motion";

interface InstrumentSelectionProps {
  onSelect: (instrument: string) => void;
}

const instruments = [
  {
    id: "guitar",
    name: "Gitar",
    icon: Guitar,
    bgColor: "bg-rose-500",
    hoverBg: "bg-rose-50",
  },
  {
    id: "bass",
    name: "Bass",
    icon: Music,
    bgColor: "bg-cyan-500",
    hoverBg: "bg-cyan-50",
  },
  {
    id: "saxophone",
    name: "Saxophone",
    icon: Wind,
    bgColor: "bg-violet-500",
    hoverBg: "bg-violet-50",
  },
  {
    id: "drum",
    name: "Drum",
    icon: Drum,
    bgColor: "bg-emerald-500",
    hoverBg: "bg-emerald-50",
  },
  {
    id: "vocal",
    name: "Vokal",
    icon: Mic,
    bgColor: "bg-pink-500",
    hoverBg: "bg-pink-50",
  },
  {
    id: "piano",
    name: "Piano",
    icon: Piano,
    bgColor: "bg-indigo-500",
    hoverBg: "bg-indigo-50",
  },
];

export const InstrumentSelection = ({ onSelect }: InstrumentSelectionProps) => {
  return (
    // UBAH: Padding container dikurangi di mobile (p-4), tetap besar di desktop (md:p-8)
    <div className="space-y-6 p-4 md:space-y-8 md:p-8 bg-white dark:bg-card rounded-2xl">
      <div className="text-center space-y-2 md:space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          // UBAH: Judul lebih kecil di mobile
          className="text-2xl md:text-4xl font-bold"
        >
          <span className="text-foreground">Pilih </span>
          <span className="text-amber-600">Instrumen Anda</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm md:text-base text-muted-foreground"
        >
          Instrumen mana yang ingin Anda uji?
        </motion.p>
      </div>

      {/* UBAH: Gap antar kartu diperkecil di mobile (gap-3) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto">
        {instruments.map((instrument, idx) => (
          <motion.button
            key={instrument.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelect(instrument.id)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            // UBAH: Padding dalam kartu dikurangi drastis di mobile (p-4 vs md:p-8)
            // UBAH: Border radius disesuaikan (rounded-xl vs md:rounded-2xl)
            className={`group relative overflow-hidden rounded-xl md:rounded-2xl border-2 border-border/50 transition-all p-4 md:p-8 text-center space-y-3 md:space-y-4 bg-white dark:bg-card hover:shadow-lg flex flex-col items-center justify-center`}
          >
            {/* Hover background effect */}
            <div
              className={`absolute inset-0 ${instrument.hoverBg} dark:bg-${
                instrument.bgColor.split("-")[1]
              }-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />

            {/* UBAH: Container Icon mengecil di mobile (w-12 vs md:w-20) */}
            <div
              className={`relative ${instrument.bgColor} w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl mx-auto flex items-center justify-center shadow-md shrink-0`}
            >
              {/* UBAH: Icon mengecil di mobile (w-6 vs md:w-10) */}
              <instrument.icon
                className="w-6 h-6 md:w-10 md:h-10 text-white"
                strokeWidth={2.5}
              />
            </div>

            {/* UBAH: Ukuran font label disesuaikan */}
            <h3 className="relative font-semibold text-xs md:text-base text-foreground leading-tight">
              {instrument.name}
            </h3>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
