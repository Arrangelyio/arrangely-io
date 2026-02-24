import { motion } from 'framer-motion';
import { Handshake, Users2, Link } from 'lucide-react';
import arrangelyLogoGram from '@/assets/arrangely-logo-gram.png';

export default function CollaborationBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Expanding concentric circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
            style={{
              width: 100 + i * 100,
              height: 100 + i * 100,
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Watermark logo */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 opacity-10"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.08, 0.12, 0.08],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img 
          src={arrangelyLogoGram} 
          alt="" 
          className="w-full h-full object-contain"
        />
      </motion.div>

      {/* Collaboration icons */}
      <motion.div
        className="absolute top-20 left-1/4"
        animate={{
          y: [0, -10, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Handshake className="w-10 h-10 text-white/30" />
      </motion.div>
      <motion.div
        className="absolute bottom-24 right-1/4"
        animate={{
          y: [0, -8, 0],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          delay: 0.5,
          ease: "easeInOut",
        }}
      >
        <Users2 className="w-12 h-12 text-white/25" />
      </motion.div>
      <motion.div
        className="absolute top-1/3 right-16"
        animate={{
          rotate: [0, 360],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <Link className="w-8 h-8 text-white/30" />
      </motion.div>

      {/* Interconnected network lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <motion.path
          d="M0,50 Q25,30 50,50 T100,50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-accent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
        />
      </svg>

      {/* Brand gradient orbs */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-48 h-48 bg-accent/15 rounded-full blur-3xl"
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
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-primary/20 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
