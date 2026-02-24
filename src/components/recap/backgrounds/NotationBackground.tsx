import { motion } from 'framer-motion';
import codaSign from '@/assets/coda_sign.svg';
import segno from '@/assets/segno.svg';
import quarterRest from '@/assets/quarter_rest.svg';
import eighthRest from '@/assets/eighth_rest.svg';
import wholeRest from '@/assets/whole_rest.svg';
import halfRest from '@/assets/half_rest.svg';

const notations = [
  { src: codaSign, x: 10, y: 15, size: 40, rotation: 15 },
  { src: segno, x: 80, y: 20, size: 35, rotation: -10 },
  { src: quarterRest, x: 25, y: 70, size: 30, rotation: 5 },
  { src: eighthRest, x: 70, y: 75, size: 28, rotation: -15 },
  { src: wholeRest, x: 15, y: 45, size: 32, rotation: 10 },
  { src: halfRest, x: 85, y: 50, size: 32, rotation: -5 },
  { src: codaSign, x: 50, y: 10, size: 35, rotation: -20 },
  { src: segno, x: 40, y: 85, size: 30, rotation: 25 },
];

export default function NotationBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Staff lines (faded) */}
      <div className="absolute inset-0 flex flex-col justify-center gap-6 opacity-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full h-0.5 bg-white" />
        ))}
      </div>

      {/* Floating musical notation symbols */}
      {notations.map((notation, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${notation.x}%`,
            top: `${notation.y}%`,
            width: notation.size,
            height: notation.size,
          }}
          initial={{ 
            opacity: 0,
            rotate: notation.rotation,
            scale: 0.5,
          }}
          animate={{
            opacity: [0.1, 0.2, 0.1],
            y: [0, -15, 0],
            rotate: [notation.rotation, notation.rotation + 10, notation.rotation],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        >
          <img 
            src={notation.src} 
            alt="" 
            className="w-full h-full object-contain invert opacity-60"
            style={{ filter: 'invert(1) brightness(2)' }}
          />
        </motion.div>
      ))}

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Soft glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
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
