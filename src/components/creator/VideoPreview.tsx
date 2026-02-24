import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { extractYouTubeVideoId } from "@/utils/youtubeUtils";

interface VideoPreviewProps {
  videoUrl: string;
}

export default function VideoPreview({ videoUrl }: VideoPreviewProps) {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isCloudflareVideo, setIsCloudflareVideo] = useState(false);

  useEffect(() => {
    const getSignedUrl = async () => {
      setLoading(true);
      setError("");

      try {
        // 0) Check if it's a YouTube video first (no API calls needed)
        const youtubeVideoId = extractYouTubeVideoId(videoUrl);
        if (youtubeVideoId) {
          setSignedUrl(`https://www.youtube.com/embed/${youtubeVideoId}`);
          setLoading(false);
          return;
        }

        // 1) Check if it's a Cloudflare Stream video UID (alphanumeric, no slashes or protocol)
        const cloudflareUidPattern = /^[a-f0-9]{32}$/i;
        if (cloudflareUidPattern.test(videoUrl)) {
          setIsCloudflareVideo(true);
          setLoading(false);
          return;
        }

        // 2) If it's a relative storage path (preferred)
        if (!videoUrl.startsWith('http') && videoUrl.includes('/')) {
          const { data, error } = await supabase.storage
            .from('lesson-videos')
            .createSignedUrl(videoUrl, 3600);

          if (error) {
            console.error('Signed URL error:', error);
            setError('Failed to load video');
            return;
          }

          if (data?.signedUrl) setSignedUrl(data.signedUrl);
          return;
        }

        // 3) Handle legacy public Supabase Storage URLs by converting to signed URLs
        if (videoUrl.startsWith('http')) {
          try {
            const url = new URL(videoUrl);
            const publicPrefix = '/storage/v1/object/public/lesson-videos/';
            const signedPrefix = '/storage/v1/object/sign/lesson-videos/';

            if (url.pathname.includes(publicPrefix)) {
              const path = url.pathname.split(publicPrefix)[1];
              const { data, error } = await supabase.storage
                .from('lesson-videos')
                .createSignedUrl(path, 3600);
              if (error) {
                console.error('Signed URL (legacy public) error:', error);
                setError('Failed to load video');
                return;
              }
              if (data?.signedUrl) setSignedUrl(data.signedUrl);
              return;
            }

            // Already a signed URL -> use directly
            if (url.pathname.includes(signedPrefix)) {
              setSignedUrl(videoUrl);
              return;
            }
          } catch (e) {
            // Not a valid URL or other error -> fall back to using as-is
          }

          // 4) Non-Supabase external URL (e.g., CDN). Use directly
          setSignedUrl(videoUrl);
          return;
        }
      
      } catch (err) {
        console.error('Video preview error:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    if (videoUrl) {
      getSignedUrl();
    }
  }, [videoUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
        {error}
      </div>
    );
  }

  // Display Cloudflare Stream video (creator dashboard preview - no auth required)
  if (isCloudflareVideo) {
    return (
      <div className="relative w-full pt-[56.25%]">
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={`https://iframe.cloudflarestream.com/${videoUrl}`}
          title="Video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Check if it's a YouTube URL (embed URL from early detection)
  if (signedUrl.includes('youtube.com/embed/')) {
    return (
      <div className="relative w-full pt-[56.25%]">
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={signedUrl}
          title="YouTube video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Display regular video player for uploaded videos
  return (
    <video
      src={signedUrl}
      controls
      className="w-full rounded-lg"
      preload="metadata"
    />
  );
}
