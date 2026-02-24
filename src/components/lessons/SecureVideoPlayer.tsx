import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { extractYouTubeVideoId } from "@/utils/youtubeUtils";
import CloudflareVideoPlayer from "./CloudflareVideoPlayer";

interface SecureVideoPlayerProps {
  videoUrl: string;
  contentId: string;
  lessonId: string;
  userEmail?: string;
  userName?: string;
  onVideoEnd?: () => void;
}

export default function SecureVideoPlayer({
  videoUrl,
  contentId,
  lessonId,
  onVideoEnd,
}: SecureVideoPlayerProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedStreamUrl, setSignedStreamUrl] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  /** ────────────── AUTHORIZATION + SIGNED URL ────────────── **/
  useEffect(() => {
  const getSignedStreamUrl = async () => {
    try {
      // --- YouTube check first ---
      const ytId = extractYouTubeVideoId(videoUrl);
      if (ytId) {
        setYoutubeVideoId(ytId);
        setIsAuthorized(true);
        return;
      }

      // --- Auth check ---
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError("Please login to access this content");
        return;
      }

        const { data, error } = await supabase.functions.invoke(
          "get-cloudflare-stream-url",
          {
            body: {
              lessonId,
              contentId,
              videoId: videoUrl,
            },
          }
        );

        // === ERROR HANDLING ===
        if (error) {
          console.error("Failed to load video:", error);

          setError(error.message || "Failed to load video");

          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You must be enrolled to access this content",
          });

          return;
        }

        // === SUCCESS ===
        const { signedUrl, expiresIn } = data;

        setSignedStreamUrl(signedUrl);
        setIsAuthorized(true);

      // Refresh signed URL before expired
      if (data.expiresIn) {
        setTimeout(
          () => getSignedStreamUrl(),
          Math.max(1000, (data.expiresIn - 10) * 1000)
        );
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setError("Failed to verify access");
    }
  };

  getSignedStreamUrl();
}, [videoUrl, contentId, lessonId]);


  /** ────────────── CLOUDFLARE IFRAME EVENT LISTENER ────────────── **/
  useEffect(() => {
    if (!signedStreamUrl || !isAuthorized || youtubeVideoId) return;

    const handleMessage = (event: MessageEvent) => {
  if (
    event.origin.includes("cloudflare") ||
    event.origin.includes("videodelivery.net")
  ) {
    try {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      

      // ✅ Case 1: Regular event ended
      if (data.event === "ended") {
        
        onVideoEnd?.();
      }

      // ✅ Case 2: Playback status ended
      if (data.playbackStatus === "ended" || data.status === "ended") {
        
        onVideoEnd?.();
      }

      // ✅ Case 3: propertyChange internal event
      if (
        data.__privateUnstableMessageType === "propertyChange" &&
        data.property === "ended" &&
        data.value === true
      ) {
        
        onVideoEnd?.();
      }

      // ✅ Case 4: fallback timeupdate
      if (data.event === "timeupdate" && data.duration > 0) {
        const nearEnd = data.currentTime >= data.duration - 0.5;
        if (nearEnd) {
          
          onVideoEnd?.();
        }
      }
    } catch (e) {
      console.warn("⚠️ Error parsing Cloudflare Stream message:", e);
    }
  }
    };


    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [signedStreamUrl, isAuthorized, youtubeVideoId, onVideoEnd]);

  /** ────────────── YOUTUBE PLAYER HANDLING ────────────── **/
  useEffect(() => {
    if (!youtubeVideoId || !onVideoEnd) return;

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    // Initialize once API ready
    window.onYouTubeIframeAPIReady = () => {
      new window.YT.Player(`yt-player-${youtubeVideoId}`, {
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              
              onVideoEnd?.();
            }
          },
        },
      });
    };
  }, [youtubeVideoId, onVideoEnd]);

  /** ────────────── RENDER STATES ────────────── **/
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  /** ────────────── YOUTUBE EMBED ────────────── **/
  if (youtubeVideoId) {
    return (
      <div className="relative w-full pt-[56.25%]">
        <iframe
          id={`yt-player-${youtubeVideoId}`}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  /** ────────────── CLOUDFLARE STREAM ────────────── **/
  return (
    <div className="relative">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {signedStreamUrl && (
          <>
            {signedStreamUrl.includes(".m3u8") ? (
              <CloudflareVideoPlayer
                videoUrl={signedStreamUrl}
                onVideoEnd={onVideoEnd}
              />
            ) : (
              <iframe
                ref={iframeRef}
                src={`${signedStreamUrl}?autoplay=false&preload=metadata`}
                className="w-full h-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            )}
          </>
        )}
      </div>

      {/* Copyright Notice */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        <Lock className="h-3 w-3 inline mr-1" />
        This content is protected and watermarked. Recording, downloading, or
        redistributing is prohibited.
      </div>
    </div>
  );
}
