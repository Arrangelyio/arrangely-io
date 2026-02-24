import { motion } from 'framer-motion';
import { Share2, MessageCircle, Send, Heart, Link2 } from 'lucide-react';
import arrangelyLogoGram from '@/assets/arrangely-logo-gram.png';

// Social icons
const socialIcons = [
  { x: 15, y: 25, icon: 'whatsapp', delay: 0 },
  { x: 82, y: 20, icon: 'share', delay: 0.3 },
  { x: 20, y: 70, icon: 'heart', delay: 0.6 },
  { x: 78, y: 75, icon: 'send', delay: 0.9 },
  { x: 50, y: 15, icon: 'link', delay: 1.2 },
  { x: 45, y: 80, icon: 'message', delay: 1.5 },
];

// Connection nodes for the network
const nodes = [
  { x: 50, y: 50 }, // center
  { x: 25, y: 30 },
  { x: 75, y: 30 },
  { x: 25, y: 70 },
  { x: 75, y: 70 },
  { x: 50, y: 20 },
  { x: 50, y: 80 },
];

export default function SocialBackground() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return <MessageCircle className="w-5 h-5" />;
      case 'share': return <Share2 className="w-5 h-5" />;
      case 'heart': return <Heart className="w-5 h-5" />;
      case 'send': return <Send className="w-5 h-5" />;
      case 'link': return <Link2 className="w-5 h-5" />;
      case 'message': return <MessageCircle className="w-5 h-5" />;
      default: return <Share2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Ripple effects from center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20"
            initial={{ width: 50, height: 50, opacity: 0.4 }}
            animate={{
              width: [50, 300, 500],
              height: [50, 300, 500],
              opacity: [0.4, 0.2, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 1.3,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Watermark logo at center */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-48 md:h-48 opacity-10"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
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

      {/* Connection lines from center */}
      <svg className="absolute inset-0 w-full h-full">
        {nodes.slice(1).map((node, i) => (
          <motion.line
            key={i}
            x1="50%"
            y1="50%"
            x2={`${node.x}%`}
            y2={`${node.y}%`}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              ease: "easeOut",
            }}
          />
        ))}
      </svg>

      {/* Social media icon network */}
      {socialIcons.map((social, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${social.x}%`,
            top: `${social.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: social.delay,
            ease: "easeInOut",
          }}
        >
          <div className="w-10 h-10 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center border border-white/20 text-white/50">
            {getIcon(social.icon)}
          </div>
        </motion.div>
      ))}

      {/* Golden accent orbs */}
      <motion.div
        className="absolute top-1/3 right-1/4 w-40 h-40 bg-accent/20 rounded-full blur-3xl"
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
        className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-primary/15 rounded-full blur-3xl"
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
