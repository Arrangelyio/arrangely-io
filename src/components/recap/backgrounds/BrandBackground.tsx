import { motion } from 'framer-motion';
import arrangelyLogoGram from '@/assets/arrangely-logo-gram.png';

export default function BrandBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large watermark logo */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 opacity-10"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 1 }}
      >
        <img 
          src={arrangelyLogoGram} 
          alt="" 
          className="w-full h-full object-contain"
        />
      </motion.div>

      {/* Animated waveform lines at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 w-1.5 md:w-2 bg-gradient-to-t from-accent/50 via-primary/30 to-transparent rounded-full"
            style={{
              left: `${8 + i * 8}%`,
            }}
            initial={{ height: `${20 + Math.random() * 30}%` }}
            animate={{
              height: [
                `${20 + Math.random() * 30}%`,
                `${40 + Math.random() * 40}%`,
                `${20 + Math.random() * 30}%`,
              ],
            }}
            transition={{
              duration: 1.2 + Math.random() * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.08,
            }}
          />
        ))}
      </div>

      {/* Floating golden orbs */}
      <motion.div
        className="absolute top-20 right-20 w-24 h-24 md:w-32 md:h-32 bg-accent/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, 10, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-40 left-16 w-20 h-20 md:w-24 md:h-24 bg-accent/15 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
      <motion.div
        className="absolute bottom-40 right-32 w-16 h-16 md:w-20 md:h-20 bg-accent/25 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.25, 0.4, 0.25],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  );
}
