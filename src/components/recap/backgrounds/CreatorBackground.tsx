import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';

// Star particles
const stars = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 8 + Math.random() * 12,
  delay: Math.random() * 3,
  duration: 2 + Math.random() * 2,
}));

// Floating verified badges
const badges = [
  { x: 15, y: 20 },
  { x: 80, y: 25 },
  { x: 25, y: 75 },
  { x: 85, y: 70 },
  { x: 10, y: 50 },
  { x: 90, y: 45 },
];

export default function CreatorBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Golden edge glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-yellow-500/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/10" />

      {/* Floating verified badges */}
      {badges.map((badge, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${badge.x}%`,
            top: `${badge.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.1, 1],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3 + Math.random(),
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        >
          <div className="w-8 h-8 bg-blue-500/80 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </motion.div>
      ))}

      {/* Star particles with sparkle */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0.5, 1, 0.5],
            rotate: [0, 180],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        >
          <Star 
            className="text-yellow-400/60" 
            style={{ width: star.size, height: star.size }}
            fill="currentColor"
          />
        </motion.div>
      ))}

      {/* Warm glow orbs */}
      <motion.div
        className="absolute top-1/4 right-1/3 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/3 left-1/4 w-40 h-40 bg-orange-500/15 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
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
