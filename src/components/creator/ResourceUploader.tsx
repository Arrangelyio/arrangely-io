import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ResourceUploaderProps {
  lessonId: string;
  onResourceUploaded: (url: string) => void;
  currentResourceUrl?: string;
}

export default function ResourceUploader({
  lessonId,
  onResourceUploaded,
  currentResourceUrl,
}: ResourceUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setUploading(true);
    setFileName(file.name);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${lessonId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("lesson-resources")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("lesson-resources").getPublicUrl(data.path);

      setUploadProgress(100);
      onResourceUploaded(publicUrl);
      toast.success("Resource uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload resource");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveResource = () => {
    setFileName(null);
    onResourceUploaded("");
  };

  return (
    <div className="space-y-4">
      {currentResourceUrl ? (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Resource Uploaded</p>
                <a
                  href={currentResourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  View Resource
                </a>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemoveResource}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload PDFs, Word documents, PowerPoint, images, or text files
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Maximum file size: 50MB
            </p>
            <input
              id="resource-upload"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("resource-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </>
              )}
            </Button>
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{fileName}</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
