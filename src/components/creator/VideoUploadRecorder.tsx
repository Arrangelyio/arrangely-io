import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Video, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface VideoUploadRecorderProps {
  onVideoUploaded: (url: string, duration: number) => void;
  lessonId: string;
}

export default function VideoUploadRecorder({ onVideoUploaded, lessonId }: VideoUploadRecorderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Could not access camera/microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file",
        description: "Please select a video file",
        variant: "destructive"
      });
      return;
    }

    await uploadVideo(file);
  };

  const uploadRecordedVideo = async () => {
    if (!recordedBlob) return;
    await uploadVideo(new File([recordedBlob], `recording-${Date.now()}.webm`, { type: 'video/webm' }));
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload videos");
      }

      setUploadProgress(10);
      toast({ title: "Preparing video..." });

      // Get video duration
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const durationInSeconds = Math.round(video.duration);
      const durationInMinutes = Math.ceil(durationInSeconds / 60); // Convert to minutes, round up
      setUploadProgress(20);

      // Get user profile for watermark
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const watermarkText = `${profile?.display_name || user.email || "User"} - ${new Date().toLocaleDateString()}`;

      toast({ title: "Uploading to Cloudflare Stream..." });
      setUploadProgress(30);

      // Send video file directly to edge function
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('video', file);
      formData.append('lessonId', lessonId);
      formData.append('watermarkText', watermarkText);
      formData.append('userId', user.id);

      const response = await fetch(
        `https://jowuhdfznveuopeqwzzd.supabase.co/functions/v1/upload-to-cloudflare-stream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to upload to Cloudflare Stream";
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
        } catch (parseError) {
          const textError = await response.text();
          console.error("Raw error response:", textError);
          errorMessage = textError || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      

      setUploadProgress(100);

      toast({
        title: "Success!",
        description: "Video uploaded and processed with watermark",
      });

      // Return Cloudflare Stream video ID
      onVideoUploaded(result.videoId, durationInMinutes);
      
      setRecordedBlob(null);
      setPreviewUrl("");

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Video Content</Label>
      
      {previewUrl && (
        <div className="relative">
          <video src={previewUrl} controls className="w-full rounded-lg" />
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={() => {
              setPreviewUrl("");
              setRecordedBlob(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {recording && (
        <div className="relative">
          <video ref={videoRef} autoPlay muted className="w-full rounded-lg" />
        </div>
      )}

      <div className="flex gap-2">
        {!recording && !previewUrl && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={startRecording}
              disabled={uploading}
            >
              <Video className="h-4 w-4 mr-2" />
              Record Video
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('video-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </>
        )}

        {recording && (
          <Button type="button" onClick={stopRecording} variant="destructive">
            Stop Recording
          </Button>
        )}

        {previewUrl && recordedBlob && (
          <Button type="button" onClick={uploadRecordedVideo} disabled={uploading}>
            {uploading ? "Uploading..." : "Use This Video"}
          </Button>
        )}
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            Mengunggah: {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
}
