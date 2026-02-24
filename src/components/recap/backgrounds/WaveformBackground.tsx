import { motion } from 'framer-motion';

export default function WaveformBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* DAW-style grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Animated equalizer bars */}
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 w-2 md:w-3 bg-gradient-to-t from-orange-400/60 via-red-500/40 to-transparent rounded-full"
          style={{
            left: `${5 + i * 6}%`,
          }}
          initial={{ height: `${15 + Math.random() * 30}%` }}
          animate={{
            height: [
              `${15 + Math.random() * 30}%`,
              `${40 + Math.random() * 40}%`,
              `${15 + Math.random() * 30}%`,
            ],
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}

      {/* Energy pulse orbs */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-red-500/25 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
