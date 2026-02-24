import { motion } from 'framer-motion';
import { Music, FileMusic, FolderOpen } from 'lucide-react';

// Stacked cards representing arrangements
const cards = [
  { x: 10, y: 30, rotate: -15, delay: 0 },
  { x: 12, y: 28, rotate: -10, delay: 0.1 },
  { x: 14, y: 26, rotate: -5, delay: 0.2 },
  { x: 80, y: 60, rotate: 15, delay: 0.3 },
  { x: 78, y: 58, rotate: 10, delay: 0.4 },
  { x: 76, y: 56, rotate: 5, delay: 0.5 },
];

// Floating music notes
const notes = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 4,
  duration: 6 + Math.random() * 4,
}));

export default function LibraryBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Sheet music staff lines */}
      <div className="absolute inset-0 flex flex-col justify-around opacity-5 py-20">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full h-px bg-white" />
        ))}
      </div>

      {/* Stacked arrangement cards */}
      {cards.map((card, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${card.x}%`,
            top: `${card.y}%`,
          }}
          initial={{ opacity: 0, y: 20, rotate: card.rotate }}
          animate={{
            opacity: 0.15,
            y: [0, -5, 0],
            rotate: card.rotate,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: card.delay,
            ease: "easeInOut",
          }}
        >
          <div className="w-24 h-16 md:w-32 md:h-20 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm flex items-center justify-center">
            <FileMusic className="w-6 h-6 md:w-8 md:h-8 text-white/40" />
          </div>
        </motion.div>
      ))}

      {/* Folder icons */}
      <motion.div
        className="absolute top-20 right-20"
        animate={{
          y: [0, -8, 0],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <FolderOpen className="w-12 h-12 text-white/30" />
      </motion.div>
      <motion.div
        className="absolute bottom-32 left-16"
        animate={{
          y: [0, -6, 0],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          delay: 1,
          ease: "easeInOut",
        }}
      >
        <FolderOpen className="w-10 h-10 text-white/25" />
      </motion.div>

      {/* Floating music notes */}
      {notes.map((note) => (
        <motion.div
          key={note.id}
          className="absolute"
          style={{ left: `${note.x}%` }}
          initial={{ y: '110%', opacity: 0 }}
          animate={{
            y: '-10%',
            opacity: [0, 0.4, 0.4, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: note.duration,
            repeat: Infinity,
            delay: note.delay,
            ease: "linear",
          }}
        >
          <Music className="w-4 h-4 text-purple-300/50" />
        </motion.div>
      ))}

      {/* Gradient orbs */}
      <motion.div
        className="absolute top-1/3 left-1/3 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
