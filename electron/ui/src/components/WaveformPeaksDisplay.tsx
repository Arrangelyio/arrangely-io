/**
 * Waveform Peaks Display
 * Renders precomputed waveform peaks (from R2) without decoding audio
 * Much faster than decoding WAV files client-side
 */

import { useEffect, useRef } from 'react';

interface WaveformPeaksDisplayProps {
  peaks: number[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  color?: string;
  progressColor?: string;
  height?: number;
}

export default function WaveformPeaksDisplay({
  peaks,
  currentTime,
  duration,
  onSeek,
  color = 'hsl(215, 20%, 65%)',
  progressColor = 'hsl(215, 70%, 50%)',
  height = 60,
}: WaveformPeaksDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate progress
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = width * progress;

    // Draw bars
    const barWidth = 2;
    const barGap = 1;
    const totalBars = Math.floor(width / (barWidth + barGap));
    const samplesPerBar = peaks.length / totalBars;
    const centerY = height / 2;
    const maxHeight = (height - 4) / 2;

    for (let i = 0; i < totalBars; i++) {
      const sampleIndex = Math.floor(i * samplesPerBar);
      const peak = peaks[sampleIndex] || 0;
      const barHeight = Math.max(2, peak * maxHeight);
      const x = i * (barWidth + barGap);

      // Color based on progress
      ctx.fillStyle = x < progressX ? progressColor : color;

      // Draw bar (mirrored)
      ctx.beginPath();
      ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 1);
      ctx.fill();
    }
  }, [peaks, currentTime, duration, color, progressColor, height]);

  // Handle click to seek
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || duration <= 0) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const time = progress * duration;
    
    onSeek(Math.max(0, Math.min(time, duration)));
  };

  return (
    <div
      ref={containerRef}
      className="cursor-pointer relative w-full"
      style={{ height }}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
