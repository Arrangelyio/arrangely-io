import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

// Background components
import BrandBackground from './backgrounds/BrandBackground';
import NotationBackground from './backgrounds/NotationBackground';
import NetworkBackground from './backgrounds/NetworkBackground';
import CreatorBackground from './backgrounds/CreatorBackground';
import LibraryBackground from './backgrounds/LibraryBackground';
import WaveformBackground from './backgrounds/WaveformBackground';
import CollaborationBackground from './backgrounds/CollaborationBackground';
import MobileBackground from './backgrounds/MobileBackground';
import ConfettiBackground from './backgrounds/ConfettiBackground';
import SocialBackground from './backgrounds/SocialBackground';

export type BackgroundType = 
  | 'brand' 
  | 'notation' 
  | 'network' 
  | 'creator' 
  | 'library' 
  | 'waveform' 
  | 'collaboration' 
  | 'mobile' 
  | 'confetti' 
  | 'social'
  | 'particles';

interface RecapSlideProps {
  background: string;
  children: ReactNode;
  isActive: boolean;
  backgroundType?: BackgroundType;
}

const BackgroundComponents: Record<BackgroundType, React.ComponentType | null> = {
  brand: BrandBackground,
  notation: NotationBackground,
  network: NetworkBackground,
  creator: CreatorBackground,
  library: LibraryBackground,
  waveform: WaveformBackground,
  collaboration: CollaborationBackground,
  mobile: MobileBackground,
  confetti: ConfettiBackground,
  social: SocialBackground,
  particles: null, // Uses default particles
};

export default function RecapSlide({ background, children, isActive, backgroundType = 'particles' }: RecapSlideProps) {
  const BackgroundComponent = BackgroundComponents[backgroundType];

  return (
    <motion.div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center px-6 md:px-12 text-white overflow-hidden",
        background
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isActive ? 1 : 0, 
        scale: isActive ? 1 : 0.95,
        zIndex: isActive ? 10 : 0
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Custom background based on type */}
      {BackgroundComponent ? (
        <BackgroundComponent />
      ) : (
        /* Default floating particles background */
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full"
              initial={{
                x: Math.random() * 100 + "%",
                y: "110%",
              }}
              animate={{
                y: "-10%",
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear",
              }}
              style={{
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {children}
      </div>
    </motion.div>
  );
}

// Staggered text animation wrapper
export function StaggerText({ 
  children, 
  delay = 0 
}: { 
  children: ReactNode; 
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Emoji bounce animation
export function BounceEmoji({ 
  emoji, 
  delay = 0,
  className = ""
}: { 
  emoji: string; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.span
      className={cn("inline-block", className)}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20, 
        delay 
      }}
    >
      {emoji}
    </motion.span>
  );
}
