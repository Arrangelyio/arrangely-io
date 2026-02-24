import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

// Node positions for the network
const nodes = [
  { x: 15, y: 20 },
  { x: 35, y: 15 },
  { x: 55, y: 25 },
  { x: 75, y: 18 },
  { x: 85, y: 35 },
  { x: 25, y: 45 },
  { x: 45, y: 55 },
  { x: 65, y: 50 },
  { x: 20, y: 70 },
  { x: 50, y: 75 },
  { x: 80, y: 65 },
  { x: 70, y: 80 },
];

// Connections between nodes
const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 4],
  [5, 8], [8, 9], [9, 10], [10, 11],
  [6, 9], [7, 10], [1, 6], [2, 7],
];

export default function NetworkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full">
        {connections.map(([from, to], i) => (
          <motion.line
            key={i}
            x1={`${nodes[from].x}%`}
            y1={`${nodes[from].y}%`}
            x2={`${nodes[to].x}%`}
            y2={`${nodes[to].y}%`}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Animated pulse along connections */}
        {connections.slice(0, 6).map(([from, to], i) => (
          <motion.circle
            key={`pulse-${i}`}
            r="3"
            fill="rgba(16, 185, 129, 0.6)"
            initial={{
              cx: `${nodes[from].x}%`,
              cy: `${nodes[from].y}%`,
            }}
            animate={{
              cx: [`${nodes[from].x}%`, `${nodes[to].x}%`],
              cy: [`${nodes[from].y}%`, `${nodes[to].y}%`],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "linear",
            }}
          />
        ))}
      </svg>

      {/* Network nodes with user icons */}
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute flex items-center justify-center"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 2 + Math.random(),
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
          </div>
        </motion.div>
      ))}

      {/* Glow orbs */}
      <motion.div
        className="absolute top-1/3 left-1/4 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
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
