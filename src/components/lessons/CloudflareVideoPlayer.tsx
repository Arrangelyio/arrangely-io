import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface CloudflareVideoPlayerProps {
  videoUrl: string;
  className?: string;
  controls?: boolean;
  onVideoEnd?: () => void;
}

export default function CloudflareVideoPlayer({
  videoUrl,
  className = "w-full h-full",
  controls = true,
  onVideoEnd,
}: CloudflareVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle video ended event
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onVideoEnd) return;

    const handleEnded = () => {
      
      onVideoEnd();
    };

    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("ended", handleEnded);
    };
  }, [onVideoEnd]);

  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;

    const video = videoRef.current;

    // Check if HLS is needed (for .m3u8 URLs)
    if (videoUrl.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Video is ready to play
          
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("Fatal network error, trying to recover");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("Fatal media error, trying to recover");
                hls.recoverMediaError();
                break;
              default:
                console.error("Fatal error, cannot recover");
                hls.destroy();
                break;
            }
          }
        });

        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        video.src = videoUrl;
      }
    } else {
      // Regular video file
      video.src = videoUrl;
    }
  }, [videoUrl]);

  return (
    <video
      ref={videoRef}
      className={className}
      controls={controls}
      playsInline
    />
  );
}
