import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Video, Upload, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as tus from "tus-js-client";

interface VideoUploadRecorderProps {
  onVideoUploaded: (url: string, duration: number) => void;
  lessonId: string;
}

const TUS_PROXY_URL = "https://arrangely-tus-upload-proxy.arrangely-io.workers.dev";

const VideoUploadRecorderWithTUS = ({ onVideoUploaded, lessonId }: VideoUploadRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);

  // --- recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (err) {
      console.error("startRecording error", err);
      toast.error("Unable to start recording. Check camera/mic permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  }, [isRecording]);

  // --- helpers
  const getVideoDuration = (file: Blob): Promise<number> =>
    new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(v.src);
        resolve(Math.round(v.duration));
      };
      v.src = URL.createObjectURL(file);
    });

  // --- upload via TUS through Worker proxy
  const uploadVideoWithTUS = useCallback(async (videoBlob: Blob) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // auth & profile (optional)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const watermarkText = profile?.display_name || "Arrangely";
      const durationInSeconds = await getVideoDuration(videoBlob);
      const durationInMinutes = Math.ceil(durationInSeconds / 60);

      // Step 1: ask server (edge function) to authorize/create initial Cloudflare session metadata
      // The edge function should create a Cloudflare TUS session (POST to /accounts/{acc}/stream) and return success.
      // But Worker proxy handles TUS requests; the create-session below is optional depending on your flow.
      const { data: createResp, error: createErr } = await supabase.functions.invoke("create-cloudflare-upload-url", {
        body: {
          lessonId,
          watermarkText,
          userId: user.id,
          videoSize: videoBlob.size,
        },
      });
      if (createErr) throw createErr;
      if (!createResp?.success && createResp?.error) {
        throw new Error(createResp.error || "Upload authorization failed");
      }

      // Step 2: create tus.Upload that POSTS to Worker proxy base URL
      let extractedVideoId: string | null = null;

      const upload = new tus.Upload(videoBlob, {
        endpoint: TUS_PROXY_URL, // worker base; worker will forward to cloudflare stream
        retryDelays: [0, 3000, 6000, 12000, 24000],
        chunkSize: 50 * 1024 * 1024,
        metadata: {
          filename: `lesson-${lessonId}.webm`,
          filetype: videoBlob.type,
        },
        // IMPORTANT: called after each response (create/HEAD/PATCH)
        onAfterResponse: function (req, res) {
          try {
            // Attempt to read Location header from the create (POST) response
            const location = res.getHeader && res.getHeader("Location");
            if (!extractedVideoId && location) {
              const parts = String(location).split("/");
              extractedVideoId = parts[parts.length - 1].split("?")[0];
              // next PATCH/HEAD requests must include X-Video-ID header so Worker can forward to /stream/{videoId}
              upload.options.headers = {
                ...(upload.options.headers || {}),
                "X-Video-ID": extractedVideoId,
              };
              
            }
          } catch (e) {
            console.warn("onAfterResponse parse error", e);
          }
        },
        onError: function (err) {
          console.error("TUS upload failed:", err);
          toast.error("Upload failed: " + (err && (err as Error).message ? (err as Error).message : String(err)));
          setIsUploading(false);
          setUploadProgress(0);
        },
        onProgress: function (bytesUploaded, bytesTotal) {
          const percentage = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
          setUploadProgress(percentage);
        },
        onSuccess: function () {
          const uploadUrl = (upload as any).url || "";
          const videoId =
            uploadUrl ? String(uploadUrl).split("/").pop()?.split("?")[0] : extractedVideoId;

          
          

          if (!videoId) {
            toast.error("Upload selesai tapi videoId tidak ditemukan!");
            setIsUploading(false);
            return;
          }

          // Panggil callback yang akan menutup showVideoUpload
          onVideoUploaded(videoId, durationInMinutes);
          toast.success("Video berhasil diupload");

          setIsUploading(false);
          setUploadProgress(0);
        },
      });

      // store ref to allow cancel
      tusUploadRef.current = upload;

      // start upload (this does POST -> Worker -> Cloudflare create, then PATCH chunks)
      upload.start();

    } catch (err: any) {
      console.error("uploadVideoWithTUS error:", err);
      toast.error(err?.message || "Upload failed");
      setIsUploading(false);
    }
  }, [lessonId, onVideoUploaded]);

  // --- file input handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }
    const maxSize = 20 * 1024 * 1024 * 1024; // e.g., 20GB limit you choose
    if (file.size > maxSize) {
      toast.error("File too large");
      return;
    }
    toast.info("Starting upload...");
    await uploadVideoWithTUS(file);
  }, [uploadVideoWithTUS]);

  // --- upload recorded blob
  const uploadRecordedVideo = useCallback(async () => {
    if (!recordedChunksRef.current || recordedChunksRef.current.length === 0) {
      toast.error("No recorded video to upload");
      return;
    }
    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    await uploadVideoWithTUS(blob);
  }, [uploadVideoWithTUS]);

  const cancelUpload = useCallback(() => {
    if (tusUploadRef.current) {
      try {
        tusUploadRef.current.abort();
      } catch (e) {
        console.warn("abort error", e);
      }
      tusUploadRef.current = null;
      setIsUploading(false);
      setUploadProgress(0);
      toast.info("Upload cancelled");
    }
  }, []);

  return (
    <div className="space-y-4">
      {recordedVideoUrl && (
        <div className="relative">
          <video ref={videoPreviewRef} src={recordedVideoUrl} controls className="w-full rounded-lg" />
        </div>
      )}

      <div className="flex gap-2">
        {!isRecording && !recordedVideoUrl && !isUploading && (
          <>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
          </>
        )}

        {isRecording && (
          <Button onClick={stopRecording} variant="destructive" className="flex-1">
            <StopCircle className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        )}

        {recordedVideoUrl && !isUploading && (
          <Button onClick={uploadRecordedVideo} className="flex-1">
            <Upload className="w-4 h-4 mr-2" />
            Use This Video
          </Button>
        )}
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading video...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
          {/* <Button onClick={cancelUpload} variant="outline" size="sm" className="w-full">
            Cancel Upload
          </Button> */}
        </div>
      )}
    </div>
  );
};

export default VideoUploadRecorderWithTUS;
