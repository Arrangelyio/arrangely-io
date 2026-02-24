import { motion } from 'framer-motion';
import { Smartphone, Play, Music2, Heart, Share2 } from 'lucide-react';

// Floating UI elements
const uiElements = [
  { x: 10, y: 20, icon: 'play', delay: 0 },
  { x: 85, y: 25, icon: 'music', delay: 0.5 },
  { x: 15, y: 70, icon: 'heart', delay: 1 },
  { x: 80, y: 75, icon: 'share', delay: 1.5 },
];

// Phone silhouettes
const phones = [
  { x: 8, y: 40, scale: 0.6, rotate: -15 },
  { x: 88, y: 45, scale: 0.5, rotate: 12 },
];

export default function MobileBackground() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'play': return <Play className="w-4 h-4 text-white/60" />;
      case 'music': return <Music2 className="w-4 h-4 text-white/60" />;
      case 'heart': return <Heart className="w-4 h-4 text-white/60" />;
      case 'share': return <Share2 className="w-4 h-4 text-white/60" />;
      default: return null;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Futuristic grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "30px 30px",
        }}
      />

      {/* Phone frame silhouettes */}
      {phones.map((phone, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${phone.x}%`,
            top: `${phone.y}%`,
            transform: `rotate(${phone.rotate}deg) scale(${phone.scale})`,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        >
          <div className="w-20 h-36 border-2 border-white/20 rounded-2xl flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-white/20" />
          </div>
        </motion.div>
      ))}

      {/* Floating UI mockup elements */}
      {uiElements.map((el, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: el.delay,
            ease: "easeInOut",
          }}
        >
          <div className="w-10 h-10 bg-white/10 rounded-xl backdrop-blur-sm flex items-center justify-center border border-white/20">
            {getIcon(el.icon)}
          </div>
        </motion.div>
      ))}

      {/* App icon particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`app-${i}`}
          className="absolute w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Glow orbs */}
      <motion.div
        className="absolute top-1/4 left-1/3 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"
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
        className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"
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
