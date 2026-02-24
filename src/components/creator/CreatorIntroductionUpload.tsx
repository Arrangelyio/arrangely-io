import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Video,
  Upload,
  Loader2,
  VideoIcon,
  Link as LinkIcon,
  Camera,
  StopCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import * as tus from "tus-js-client";

const TUS_PROXY_URL =
  "https://arrangely-tus-upload-proxy.arrangely-io.workers.dev";

interface CreatorIntroductionUploadProps {
  userId: string;
  currentVideoUrl?: string | null;
  currentTitle?: string | null;
  currentDescription?: string | null;
  onUpdate?: () => void;
}

export const CreatorIntroductionUpload = ({
  userId,
  currentVideoUrl,
  currentTitle,
  currentDescription,
  onUpdate,
}: CreatorIntroductionUploadProps) => {
  const [videoUrl, setVideoUrl] = useState(currentVideoUrl || "");
  const [title, setTitle] = useState(currentTitle || "");
  const [description, setDescription] = useState(currentDescription || "");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const tusUploadRef = useRef<tus.Upload | null>(null);

  // ----------- Recording ----------
  const startRecording = async () => {
    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
      setUploadPreviewUrl("");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording started",
        description: "Your introduction video is now recording.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not access camera/microphone: " + error.message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // -------- Helpers --------
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

  // ----------- Cloudflare TUS Upload ----------
  const uploadVideoWithTUS = useCallback(
    async (file: Blob | File) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) throw new Error("Not authenticated");

        const duration = await getVideoDuration(file);

        // Call Supabase Edge function
        const { data: createResp, error: createErr } =
          await supabase.functions.invoke("create-cloudflare-upload-url", {
            body: {
              userId: userId,
              introduction: true,
              videoSize: file.size,
              watermarkText: "arrangely"
            },
          });

        if (createErr) throw createErr;
        if (!createResp?.success)
          throw new Error(createResp?.error || "Upload authorization failed");

        // TUS upload
        let extractedVideoId: string | null = null;

        const upload = new tus.Upload(file, {
          endpoint: TUS_PROXY_URL,
          retryDelays: [0, 3000, 5000, 10000],
          chunkSize: 50 * 1024 * 1024,
          metadata: {
            filename: `intro-${userId}.webm`,
            filetype: file.type,
          },

          onAfterResponse: (req, res) => {
            try {
              const location = res.getHeader("Location");
              if (location && !extractedVideoId) {
                const parts = String(location).split("/");
                extractedVideoId = parts[parts.length - 1].split("?")[0];

                upload.options.headers = {
                  ...(upload.options.headers || {}),
                  "X-Video-ID": extractedVideoId,
                };
              }
            } catch {}
          },

          onError: (err) => {
            setIsUploading(false);
            setUploadProgress(0);
            toast({
              title: "Upload failed",
              description: String(err),
              variant: "destructive",
            });
          },

          onProgress: (uploaded, total) => {
            const percent = total ? Math.round((uploaded / total) * 100) : 0;
            setUploadProgress(percent);
          },

          onSuccess: async () => {
            const uploadUrl = (upload as any).url || "";
            const videoId = uploadUrl
              ? String(uploadUrl).split("/").pop()?.split("?")[0]
              : extractedVideoId;

            

            setIsUploading(true); // pastikan loading ON

            // 🔥 ambil info cloudflare
            const { data, error } = await supabase.functions.invoke(
              "get-cloudflare-video-info",
              { body: { videoId } }
            );

            if (error) {
              console.error("Gagal get playback info:", error);
              toast({
                title: "Video uploaded, but not ready.",
                description: "Cloudflare is still processing your video.",
                variant: "destructive",
              });
              setIsUploading(false);
              return;
            }

            if (!data?.playback?.hls) {
              console.warn("Video belum siap diputar:", data);
              toast({
                title: "Processing...",
                description: "Your video is being processed by Cloudflare.",
              });
              setIsUploading(false);
              return;
            }

            const playbackUrl = data.playback.hls;

            

            // ⏳ Delay 5 detik + tampilkan loading text
            toast({
              title: "Processing your video...",
              description: "Please wait 7 seconds...",
            });

            await new Promise((res) => setTimeout(res, 7000));

            // 🔥 update UI
            setVideoUrl(playbackUrl);
            setUploadProgress(100);
            setIsUploading(false);

            toast({
              title: "Video Ready!",
              description: "You can now save your introduction.",
            });
          }
        });

        tusUploadRef.current = upload;
        upload.start();
      } catch (err: any) {
        setIsUploading(false);
        toast({
          title: "Upload error",
          description: err?.message || "Unknown error",
          variant: "destructive",
        });
      }
    },
    [userId]
  );

  // -------- Upload Handlers --------
  const handleUploadFile = async () => {
    if (!selectedFile) return;
    await uploadVideoWithTUS(selectedFile);
  };

  const uploadRecordedVideo = async () => {
    if (!recordedBlob) return;
    await uploadVideoWithTUS(recordedBlob);
  };

  // -------- File selection --------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);

    setSelectedFile(file);
    setVideoUrl("");
    setRecordedBlob(null);

    const localUrl = URL.createObjectURL(file);
    setUploadPreviewUrl(localUrl);
  };

  const discardRecording = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl("");
  };

  // -------- Save intro info --------
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          introduction_video_url: videoUrl,
          introduction_title: title,
          introduction_description: description,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Your introduction video has been saved.",
      });

      onUpdate?.();
      navigate("/arrangely-music-lab");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // -------- Cleanup --------
  useEffect(() => {
    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    };
  }, [previewUrl, uploadPreviewUrl]);

  useEffect(() => {
    if (isRecording && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isRecording]);

  // -------- RETURN (UI tidak diubah) --------
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <CardTitle>Creator Introduction Video</CardTitle>
        </div>
        <CardDescription>
          Help students get to know you better! Upload a video introducing
          yourself, your teaching style, and what makes you unique.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Video URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Video
            </TabsTrigger>
            <TabsTrigger value="record" className="gap-2">
              <Camera className="h-4 w-4" />
              Record Video
            </TabsTrigger>
          </TabsList>

          {/* ============================================
                TAB URL
              ============================================ */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <Label>Video URL</Label>
            <Input
              type="url"
              placeholder="YouTube or Vimeo URL"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setSelectedFile(null);
                setRecordedBlob(null);
                if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
                setUploadPreviewUrl("");
              }}
            />
          </TabsContent>

          {/* ============================================
                TAB UPLOAD
              ============================================ */}
          <TabsContent value="upload" className="space-y-4 mt-4">
            <Label>Upload Video</Label>
            <Input
              type="file"
              accept="video/*"
              disabled={isUploading}
              onChange={handleFileChange}
            />

            {selectedFile && !isUploading && (
              <div className="flex items-center justify-between p-2 border rounded-md">
                <span>{selectedFile.name}</span>
                <Button onClick={handleUploadFile} size="sm">
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
              </div>
            )}

            {isUploading && (
              <div>
                <Progress value={uploadProgress} />
                <p className="text-center text-sm mt-2">
                  Uploading: {uploadProgress}%
                </p>
              </div>
            )}
          </TabsContent>

          {/* ============================================
                TAB RECORD
              ============================================ */}
          <TabsContent value="record" className="space-y-4 mt-4">
            {!recordedBlob && !isRecording && (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                  <Button onClick={startRecording} className="mt-4">
                    <VideoIcon className="mr-2 h-4 w-4" /> Start Recording
                  </Button>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    muted
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full"
                >
                  <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
                </Button>
              </div>
            )}

            {recordedBlob && previewUrl && (
              <div className="space-y-4">
                <video
                  src={previewUrl}
                  controls
                  className="aspect-video w-full rounded-lg"
                />

                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={uploadRecordedVideo}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isUploading
                      ? `Uploading... ${uploadProgress}%`
                      : "Use This Video"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={discardRecording}
                    disabled={isUploading}
                  >
                    Buang
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ============================================
              TITLE & DESCRIPTION
            ============================================ */}
        <div>
          <Label>Title</Label>
          <Input
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-xs">{title.length}/60</p>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={description}
            rows={4}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs">{description.length}/200</p>
        </div>

        {/* ============================================
              PREVIEW
            ============================================ */}
        {(videoUrl || uploadPreviewUrl) && (
          <div>
            <Label>Preview</Label>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                src={videoUrl || uploadPreviewUrl}
                className="w-full h-full"
                controls
              />
            </div>
          </div>
        )}

        {/* ============================================
              SAVE BUTTON
            ============================================ */}
        <Button
          onClick={handleSave}
          disabled={isLoading || !videoUrl || !title || !description}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Save Introduction Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
