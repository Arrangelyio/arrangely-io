import { useState, useEffect, useRef } from 'react';

interface CountUpNumberProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  isActive?: boolean;
}

export default function CountUpNumber({
  end,
  duration = 2000,
  prefix = '',
  suffix = '',
  isActive = true,
}: CountUpNumberProps) {
  const [count, setCount] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isActive || hasStarted.current) return;
    
    hasStarted.current = true;
    
    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4);
    };

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      
      setCount(Math.floor(easedProgress * end));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [end, duration, isActive]);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'k';
    }
    return num.toLocaleString();
  };

  return (
    <span className="tabular-nums">
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}
