import { useState, useEffect } from "react";
import { 
    Music, 
    Radio, 
    Zap, 
    WifiOff, 
    Shield, 
    CheckCircle 
} from "lucide-react";

interface Feature {
    icon: React.ElementType;
    title: string;
    description: string;
    highlights: string[];
}

const features: Feature[] = [
    {
        icon: Music,
        title: "Multi-Track Playback",
        description: "Take full control of your music with independent track management and professional mixing capabilities.",
        highlights: [
            "Control individual instrument tracks",
            "Adjust volumes and mute/solo tracks",
            "Professional DAW-style interface"
        ]
    },
    {
        icon: Radio,
        title: "Live Sync with Chord Arrangements",
        description: "Perfect synchronization for live performances with real-time chord progression display.",
        highlights: [
            "MD controls the tempo",
            "Automatic section progression",
            "Real-time chord display for all musicians"
        ]
    },
    {
        icon: Zap,
        title: "Instant Section Jump",
        description: "Navigate through song sections with lightning speed for seamless live performances.",
        highlights: [
            "One-click section navigation",
            "Perfect for live performances",
            "Flexible arrangement changes"
        ]
    },
    {
        icon: WifiOff,
        title: "Offline Mode",
        description: "Play your entire library without internet connection. Sync once, play anywhere.",
        highlights: [
            "Download songs for offline use",
            "No internet required during playback",
            "Automatic sync when online"
        ]
    },
    {
        icon: Shield,
        title: "Creator Security",
        description: "Your music files are protected with enterprise-grade security and encrypted playback.",
        highlights: [
            "Encrypted file storage",
            "Playback-only access for protection",
            "Secure creator content"
        ]
    }
];

export default function FeatureCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setActiveIndex((prev) => (prev + 1) % features.length);
                setIsAnimating(false);
            }, 300);
        }, 5000);

        return () => clearInterval(timer);
    }, []);

    const handleDotClick = (index: number) => {
        if (index !== activeIndex) {
            setIsAnimating(true);
            setTimeout(() => {
                setActiveIndex(index);
                setIsAnimating(false);
            }, 300);
        }
    };

    const currentFeature = features[activeIndex];
    const IconComponent = currentFeature.icon;

    return (
        <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center h-full px-8">
            {/* Feature Content */}
            <div 
                className={`text-center transition-all duration-300 ${
                    isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
            >
                {/* Icon with gradient background */}
                <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[hsl(145,65%,42%)] to-[hsl(145,45%,25%)] flex items-center justify-center shadow-lg shadow-[hsl(145,50%,30%)/30]">
                    <IconComponent className="w-10 h-10 text-white" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-4">
                    {currentFeature.title}
                </h2>

                {/* Description */}
                <p className="text-[hsl(0,0%,65%)] mb-8 leading-relaxed">
                    {currentFeature.description}
                </p>

                {/* Highlights */}
                <div className="space-y-3">
                    {currentFeature.highlights.map((highlight, idx) => (
                        <div 
                            key={idx} 
                            className="flex items-center justify-center gap-3"
                        >
                            <CheckCircle className="w-4 h-4 text-[hsl(145,65%,50%)] flex-shrink-0" />
                            <span className="text-[hsl(0,0%,80%)] text-sm">
                                {highlight}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dot Navigation */}
            <div className="flex items-center gap-2 mt-12">
                {features.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => handleDotClick(index)}
                        className={`
                            w-2 h-2 rounded-full transition-all duration-300
                            ${index === activeIndex 
                                ? "w-6 bg-[hsl(145,65%,50%)]" 
                                : "bg-[hsl(0,0%,35%)] hover:bg-[hsl(0,0%,45%)]"
                            }
                        `}
                        aria-label={`Go to feature ${index + 1}`}
                    />
                ))}
            </div>

            {/* Subtle branding */}
            <div className="mt-12 text-center">
                <p className="text-[hsl(0,0%,40%)] text-xs uppercase tracking-wider">
                    Arrangely Live Studio
                </p>
                <p className="text-[hsl(0,0%,30%)] text-[10px] mt-1">
                    Professional Backing Track Player
                </p>
            </div>
        </div>
    );
}
