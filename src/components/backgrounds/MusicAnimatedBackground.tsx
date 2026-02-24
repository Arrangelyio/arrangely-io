import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'full' | 'subtle' | 'minimal';

interface MusicAnimatedBackgroundProps {
  variant?: Variant;
  className?: string;
}

const variantConfig: Record<Variant, {
  opacity: number;
  showWaveforms: boolean;
  showNodes: boolean;
  showFlowLines: boolean;
  waveformBars: number;
  nodeCount: number;
}> = {
  full: {
    opacity: 0.6,
    showWaveforms: true,
    showNodes: true,
    showFlowLines: true,
    waveformBars: 24,
    nodeCount: 12,
  },
  subtle: {
    opacity: 0.4,
    showWaveforms: true,
    showNodes: true,
    showFlowLines: true,
    waveformBars: 16,
    nodeCount: 8,
  },
  minimal: {
    opacity: 0.25,
    showWaveforms: false,
    showNodes: false,
    showFlowLines: true,
    waveformBars: 0,
    nodeCount: 0,
  },
};

// Audio Waveform visualization on sides
const AudioWaveform = memo(({ 
  side, 
  barCount, 
  opacity 
}: { 
  side: 'left' | 'right'; 
  barCount: number; 
  opacity: number;
}) => {
  const bars = useMemo(() => 
    Array.from({ length: barCount }, (_, i) => ({
      id: i,
      height: 20 + Math.random() * 60,
      delay: i * 0.05,
      duration: 0.6 + Math.random() * 0.4,
    })),
    [barCount]
  );

  return (
    <div 
      className={cn(
        "absolute top-1/2 -translate-y-1/2 flex items-center gap-[2px]",
        side === 'left' ? "left-4 md:left-8" : "right-4 md:right-8"
      )}
      style={{ opacity }}
    >
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="w-[2px] md:w-[3px] rounded-full bg-gradient-to-t from-purple-500/60 via-purple-400/40 to-purple-300/20"
          initial={{ height: bar.height * 0.5 }}
          animate={{
            height: [bar.height * 0.3, bar.height, bar.height * 0.5, bar.height * 0.8, bar.height * 0.3],
          }}
          transition={{
            duration: bar.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: bar.delay,
          }}
        />
      ))}
    </div>
  );
});

AudioWaveform.displayName = 'AudioWaveform';

// Connected nodes pattern
const ConnectedNodes = memo(({ count, opacity }: { count: number; opacity: number }) => {
  const nodes = useMemo(() => {
    const result = [];
    const centerX = 50;
    const centerY = 50;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 15 + Math.random() * 20;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      result.push({
        id: i,
        x: `${x}%`,
        y: `${y}%`,
        size: 4 + Math.random() * 6,
        type: i % 3 === 0 ? 'square' : i % 3 === 1 ? 'diamond' : 'circle',
        delay: i * 0.2,
        duration: 2 + Math.random() * 2,
      });
    }
    return result;
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity }}>
      {/* Connection lines - using viewBox for proper scaling */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="rgb(34, 211, 238)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Horizontal flow line */}
        <motion.line
          x1={20}
          y1={50}
          x2={80}
          y2={50}
          stroke="url(#lineGradient)"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        
        {/* Curved connections - using numeric values */}
        <motion.path
          d="M 25 40 Q 50 30 75 40"
          fill="none"
          stroke="rgb(34, 211, 238)"
          strokeWidth="0.5"
          strokeOpacity="0.2"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
        />
        <motion.path
          d="M 25 60 Q 50 70 75 60"
          fill="none"
          stroke="rgb(34, 211, 238)"
          strokeWidth="0.5"
          strokeOpacity="0.2"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: "easeOut", delay: 0.5 }}
        />
      </svg>
      
      {/* Nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute"
          style={{
            left: node.x,
            top: node.y,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: node.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: node.delay,
          }}
        >
          {node.type === 'square' && (
            <div 
              className="border border-cyan-400/60 bg-cyan-400/10"
              style={{ width: node.size, height: node.size }}
            />
          )}
          {node.type === 'diamond' && (
            <div 
              className="border border-cyan-400/60 bg-cyan-400/10 rotate-45"
              style={{ width: node.size, height: node.size }}
            />
          )}
          {node.type === 'circle' && (
            <div 
              className="rounded-full border border-cyan-400/60 bg-cyan-400/20"
              style={{ width: node.size, height: node.size }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
});

ConnectedNodes.displayName = 'ConnectedNodes';

// Flowing sine wave lines - using viewBox with numeric coordinates
const FlowingWaves = memo(({ opacity }: { opacity: number }) => {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="waveGradientPurple" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
          <stop offset="20%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
          <stop offset="50%" stopColor="rgb(168, 85, 247)" stopOpacity="0.5" />
          <stop offset="80%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="waveGradientCyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0" />
          <stop offset="20%" stopColor="rgb(34, 211, 238)" stopOpacity="0.2" />
          <stop offset="50%" stopColor="rgb(34, 211, 238)" stopOpacity="0.4" />
          <stop offset="80%" stopColor="rgb(34, 211, 238)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Upper wave - using numeric values in viewBox coordinate system */}
      <motion.path
        d="M 0 45 Q 25 35 50 45 T 100 45"
        fill="none"
        stroke="url(#waveGradientPurple)"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ 
          pathLength: 1,
          d: [
            "M 0 45 Q 25 35 50 45 T 100 45",
            "M 0 45 Q 25 55 50 45 T 100 45",
            "M 0 45 Q 25 35 50 45 T 100 45",
          ]
        }}
        transition={{
          pathLength: { duration: 2, ease: "easeOut" },
          d: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      {/* Middle wave */}
      <motion.path
        d="M 0 50 Q 25 45 50 50 T 100 50"
        fill="none"
        stroke="url(#waveGradientCyan)"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ 
          pathLength: 1,
          d: [
            "M 0 50 Q 25 45 50 50 T 100 50",
            "M 0 50 Q 25 55 50 50 T 100 50",
            "M 0 50 Q 25 45 50 50 T 100 50",
          ]
        }}
        transition={{
          pathLength: { duration: 2.5, ease: "easeOut", delay: 0.3 },
          d: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
        }}
      />
      
      {/* Lower wave */}
      <motion.path
        d="M 0 55 Q 25 65 50 55 T 100 55"
        fill="none"
        stroke="url(#waveGradientPurple)"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ 
          pathLength: 1,
          d: [
            "M 0 55 Q 25 65 50 55 T 100 55",
            "M 0 55 Q 25 45 50 55 T 100 55",
            "M 0 55 Q 25 65 50 55 T 100 55",
          ]
        }}
        transition={{
          pathLength: { duration: 2, ease: "easeOut", delay: 0.5 },
          d: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }
        }}
      />
    </svg>
  );
});

FlowingWaves.displayName = 'FlowingWaves';

export const MusicAnimatedBackground = memo(({
  variant = 'full',
  className,
}: MusicAnimatedBackgroundProps) => {
  const config = variantConfig[variant];

  // Respect reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  if (prefersReducedMotion) {
    return <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)} />;
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Flowing wave lines */}
      {config.showFlowLines && <FlowingWaves opacity={config.opacity} />}
      
      {/* Connected nodes pattern */}
      {config.showNodes && (
        <ConnectedNodes count={config.nodeCount} opacity={config.opacity} />
      )}
      
      {/* Audio waveforms on sides */}
      {config.showWaveforms && (
        <>
          <AudioWaveform side="left" barCount={config.waveformBars} opacity={config.opacity} />
          <AudioWaveform side="right" barCount={config.waveformBars} opacity={config.opacity} />
        </>
      )}
    </div>
  );
});

MusicAnimatedBackground.displayName = 'MusicAnimatedBackground';

export default MusicAnimatedBackground;
