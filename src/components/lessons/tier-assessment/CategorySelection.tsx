import { Music, BookOpen, Disc, Mic, PenTool } from "lucide-react";
import { motion } from "framer-motion";

interface CategorySelectionProps {
  onSelect: (category: string) => void;
}

const categories = [
  {
    id: "instrument",
    name: "Instrumen",
    icon: Music,
    bgColor: "bg-purple-500",
    hoverBg: "bg-purple-50",
    description: "Fokus pada teknik instrumen",
  },
  {
    id: "theory",
    name: "Teori Musik",
    icon: BookOpen,
    bgColor: "bg-blue-500",
    hoverBg: "bg-blue-50",
    description: "Notasi, interval, chord, scale",
  },
  {
    id: "production",
    name: "Produksi",
    icon: Disc,
    bgColor: "bg-green-500",
    hoverBg: "bg-green-50",
    description: "Recording, mixing, mastering",
  },
  {
    id: "songwriting",
    name: "Songwriting",
    icon: PenTool,
    bgColor: "bg-pink-500",
    hoverBg: "bg-pink-50",
    description: "Struktur lagu, lirik, melodi",
  },
  // {
  //   id: "worship_leader",
  //   name: "Worship Leader",
  //   icon: Mic,
  //   bgColor: "bg-orange-500",
  //   hoverBg: "bg-orange-50",
  //   description: "Spiritualitas, komunikasi, aransemen",
  // },
];

export const CategorySelection = ({ onSelect }: CategorySelectionProps) => {
  return (
    // UBAH: Padding container dikurangi di mobile (p-4), besar di desktop (md:p-8)
    <div className="space-y-6 p-4 md:space-y-8 md:p-8 bg-white dark:bg-card rounded-2xl">
      <div className="text-center space-y-2 md:space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          // UBAH: Font size responsif (text-2xl di mobile, text-4xl di desktop)
          className="text-2xl md:text-4xl font-bold"
        >
          <span className="text-foreground">Pilih </span>
          <span className="text-amber-600">Jalur Anda</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm md:text-base text-muted-foreground"
        >
          Apa yang ingin Anda kuasai?
        </motion.p>
      </div>

      {/* UBAH: Gap lebih kecil di mobile (gap-3) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto">
        {categories.map((category, idx) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelect(category.id)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            // UBAH: Padding card drastis dikurangi di mobile (p-4 vs md:p-8)
            // Tambahkan min-h agar tinggi kartu seragam
            className={`group relative overflow-hidden rounded-xl md:rounded-2xl border-2 border-border/50 hover:border-${
              category.bgColor.split("-")[1]
            }-200 transition-all p-4 md:p-8 text-center space-y-3 md:space-y-4 bg-white dark:bg-card hover:shadow-lg flex flex-col items-center justify-center h-full`}
          >
            {/* Hover background effect */}
            <div
              className={`absolute inset-0 ${category.hoverBg} dark:bg-${
                category.bgColor.split("-")[1]
              }-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />

            {/* UBAH: Ukuran box icon responsif (w-12 vs md:w-20) */}
            <div
              className={`relative ${category.bgColor} w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl mx-auto flex items-center justify-center shadow-md shrink-0`}
            >
              {/* UBAH: Ukuran icon responsif */}
              <category.icon
                className="w-6 h-6 md:w-10 md:h-10 text-white"
                strokeWidth={2.5}
              />
            </div>

            {/* UBAH: Font size judul responsif & line-height rapat */}
            <h3 className="relative font-semibold text-xs md:text-base text-foreground leading-tight">
              {category.name}
            </h3>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
