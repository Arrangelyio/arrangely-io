import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

// Generate confetti pieces
const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 5,
  duration: 5 + Math.random() * 5,
  size: 4 + Math.random() * 8,
  rotation: Math.random() * 360,
  type: ['circle', 'square', 'heart'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'heart',
  color: [
    'bg-pink-400/60',
    'bg-rose-400/60',
    'bg-red-400/60',
    'bg-orange-400/60',
    'bg-yellow-400/60',
    'bg-white/50',
  ][Math.floor(Math.random() * 6)],
}));

// Heart particles that float up
const hearts = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  delay: Math.random() * 3,
  duration: 8 + Math.random() * 4,
}));

export default function ConfettiBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Warm glow orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-pink-500/25 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Light rays from center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-40 bg-gradient-to-t from-white/5 to-transparent origin-bottom"
            style={{
              rotate: `${i * 45}deg`,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scaleY: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Confetti pieces */}
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className={`absolute ${piece.color} ${
            piece.type === 'circle' ? 'rounded-full' : 
            piece.type === 'square' ? 'rounded-sm' : ''
          }`}
          style={{
            left: `${piece.x}%`,
            width: piece.type === 'heart' ? 0 : piece.size,
            height: piece.type === 'heart' ? 0 : piece.size,
          }}
          initial={{
            y: '-10%',
            opacity: 0,
            rotate: piece.rotation,
          }}
          animate={{
            y: '110vh',
            opacity: [0, 0.8, 0.8, 0],
            rotate: piece.rotation + 360,
          }}
          transition={{
            duration: piece.duration,
            repeat: Infinity,
            delay: piece.delay,
            ease: "linear",
          }}
        >
          {piece.type === 'heart' && (
            <Heart className="w-4 h-4 text-pink-400/60 fill-pink-400/40" />
          )}
        </motion.div>
      ))}

      {/* Rising heart particles */}
      {hearts.map((heart) => (
        <motion.div
          key={`rising-${heart.id}`}
          className="absolute"
          style={{ left: `${heart.x}%` }}
          initial={{ y: '110%', opacity: 0 }}
          animate={{
            y: '-10%',
            opacity: [0, 0.6, 0.6, 0],
          }}
          transition={{
            duration: heart.duration,
            repeat: Infinity,
            delay: heart.delay,
            ease: "easeOut",
          }}
        >
          <Heart className="w-6 h-6 text-rose-400/50 fill-rose-400/30" />
        </motion.div>
      ))}
    </div>
  );
}
