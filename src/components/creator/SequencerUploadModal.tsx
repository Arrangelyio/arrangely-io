import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, X, Music, Loader2, Cloud, CheckCircle2, RotateCcw } from "lucide-react";
import { generateWaveformPeaks } from "@/lib/audioWaveformGenerator";
import { convertWavToM4a } from "@/lib/audioConverter";

interface TrackFile {
  id: string;
  name: string;
  file: File;
  originalFile?: File; // Keep original for peaks generation
  status: 'pending' | 'uploading' | 'converting' | 'complete' | 'error' | 'existing';
  progress: number;
  error?: string;
  r2AudioKey?: string;
  r2PeaksKey?: string;
  conversionInfo?: string; // Show compression info
  uploadedExtension?: string; // Store the actual uploaded file extension (m4a, wav, etc)
  color?: string; // For existing tracks
}

interface ExistingTrack {
  name: string;
  color: string;
  filename?: string;
  r2_audio_key?: string;
  r2_peaks_key?: string;
  default_pan?: number;
  default_volume?: number;
}

interface SequencerUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string;
  songTitle: string;
  songArtist: string;
}

// Helper to generate random color
const generateRandomColor = () => {
  const colors = [
    "#FF5733", "#33FF57", "#3357FF", "#FF33F5", 
    "#FFFF33", "#33FFFF", "#FF3333", "#33FF33",
    "#3333FF", "#FF33FF", "#FFAA33", "#33FFAA"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export function SequencerUploadModal({
  open,
  onOpenChange,
  songId,
  songTitle,
  songArtist,
}: SequencerUploadModalProps) {
  const [price, setPrice] = useState("50000");
  const [description, setDescription] = useState("");
  const [tracks, setTracks] = useState<TrackFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingSequencerFileId, setExistingSequencerFileId] = useState<string | null>(null);
  const [existingTracks, setExistingTracks] = useState<ExistingTrack[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [previewWavFile, setPreviewWavFile] = useState<File | null>(null);
  const [previewWavStatus, setPreviewWavStatus] = useState<'pending' | 'uploading' | 'complete' | 'error'>('pending');
  const [previewWavProgress, setPreviewWavProgress] = useState(0);
  const [existingPreviewKey, setExistingPreviewKey] = useState<string | null>(null);
  const { toast } = useToast();

  // Load existing sequencer file and tracks when modal opens
  useEffect(() => {
    if (open && songId) {
      loadExistingSequencerData();
    } else if (!open) {
      // Reset state when modal closes
      setExistingSequencerFileId(null);
      setExistingTracks([]);
      setTracks([]);
      setPrice("50000");
      setDescription("");
      setPreviewWavFile(null);
      setPreviewWavStatus('pending');
      setPreviewWavProgress(0);
      setExistingPreviewKey(null);
    }
  }, [open, songId]);

  const loadExistingSequencerData = async () => {
    setLoadingExisting(true);
    try {
      // Check if sequencer file already exists for this song
      const { data: sequencerFile, error } = await supabase
        .from("sequencer_files")
        .select(`
          id,
          description,
          tracks,
          preview_audio_r2_key,
          sequencer_file_pricing(price)
        `)
        .eq("song_id", songId)
        .maybeSingle();

      if (error) {
        console.error("Error loading existing sequencer:", error);
        return;
      }

      if (sequencerFile) {
        setExistingSequencerFileId(sequencerFile.id);
        setDescription(sequencerFile.description || "");
        
        // Get price from pricing table
        const pricing = sequencerFile.sequencer_file_pricing as any;
        if (pricing && pricing[0]?.price) {
          setPrice(pricing[0].price.toString());
        }
        
        // Set existing preview audio key
        if (sequencerFile.preview_audio_r2_key) {
          setExistingPreviewKey(sequencerFile.preview_audio_r2_key);
        }
        
        // Parse existing tracks
        const tracksData = sequencerFile.tracks as ExistingTrack[] | null;
        if (tracksData && Array.isArray(tracksData)) {
          setExistingTracks(tracksData);
        }
      }
    } catch (err) {
      console.error("Failed to load existing sequencer data:", err);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const audioFiles = files.filter((f) => {
      const fileName = f.name.toLowerCase();
      return fileName.endsWith(".wav") || fileName.endsWith(".mp3") || fileName.endsWith(".m4a");
    });

    if (audioFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please select WAV, MP3, or M4A files only",
        variant: "destructive",
      });
      return;
    }

    const newTracks: TrackFile[] = audioFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.(wav|mp3|m4a)$/i, ""),
      file,
      status: 'pending',
      progress: 0,
    }));

    setTracks((prev) => [...prev, ...newTracks]);
  };

  const removeTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTrackStatus = (id: string, update: Partial<TrackFile>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...update } : t));
  };

  const R2_UPLOAD_WORKER_URL = "https://r2-upload-worker.arrangely-io.workers.dev";

  // Upload a single track to R2 via Cloudflare Worker (audio) + Edge Function (peaks)
  const uploadTrackToR2 = async (track: TrackFile, trackIndex: number): Promise<{ audioKey: string; peaksKey: string; fileExtension: string }> => {
    const fileName = track.file.name.toLowerCase();
    const isWavFile = fileName.endsWith('.wav');
    const isM4aFile = fileName.endsWith('.m4a');
    const originalFileForPeaks = track.originalFile || track.file;
    
    // Step 1: Convert WAV to M4A if applicable (skip if already M4A or MP3)
    let fileToUpload = track.file;
    let fileExtension = track.file.name.split('.').pop()?.toLowerCase() || 'wav';
    
    if (isM4aFile) {
      // M4A files are already compressed, skip conversion
      
      updateTrackStatus(track.id, { 
        progress: 25,
        conversionInfo: 'Already compressed (M4A)'
      });
    } else if (isWavFile) {
      updateTrackStatus(track.id, { status: 'converting', progress: 5 });
      
      
      try {
        const conversionResult = await convertWavToM4a(originalFileForPeaks, (progress) => {
          // Map conversion progress to 5-25%
          updateTrackStatus(track.id, { progress: 5 + (progress * 0.2) });
        });
        
        fileToUpload = conversionResult.file;
        // Get extension from the converted file name (e.g., "track.m4a" -> "m4a")
        fileExtension = conversionResult.file.name.split('.').pop()?.toLowerCase() || 'm4a';
        
        const savedMB = ((conversionResult.originalSize - conversionResult.convertedSize) / 1024 / 1024).toFixed(1);
        const ratio = conversionResult.compressionRatio.toFixed(1);
        
        
        updateTrackStatus(track.id, { 
          progress: 25,
          conversionInfo: `Compressed ${ratio}x (saved ${savedMB}MB)`
        });
      } catch (convError) {
        console.warn(`Conversion failed, uploading original WAV:`, convError);
        // Fall back to original WAV if conversion fails
        fileToUpload = originalFileForPeaks;
        fileExtension = 'wav';
      }
    }
    
    updateTrackStatus(track.id, { status: 'uploading', progress: 30 });

    // Step 2: Generate peaks from ORIGINAL file (before conversion for accuracy)
    
    const peaks = await generateWaveformPeaks(originalFileForPeaks);
    updateTrackStatus(track.id, { progress: 40 });

    // Step 3: Get auth token for uploads
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    // Step 4: Upload audio via Cloudflare Worker
    
    
    const formData = new FormData();
    // Use 'audioFile' as expected by the worker
    formData.append('audioFile', fileToUpload, `${trackIndex}.${fileExtension}`);
    formData.append('songId', songId);
    formData.append('trackIndex', trackIndex.toString());
    formData.append('trackName', track.name);
    formData.append('fileExtension', fileExtension); // Explicitly pass the extension
    
    const audioResponse = await fetch(R2_UPLOAD_WORKER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error("Worker upload failed:", errorText);
      throw new Error(`Audio upload failed: ${audioResponse.status} - ${errorText}`);
    }

    const audioResult = await audioResponse.json();
    
    updateTrackStatus(track.id, { progress: 70 });

    // Get the audioKey from the worker response
    const audioKey = audioResult.audioKey;

    // Step 5: Upload peaks via Supabase Edge Function
    
    const { data: peaksData, error: peaksError } = await supabase.functions.invoke('upload-r2-peaks', {
      body: {
        songId,
        trackIndex,
        peaks,
      },
    });

    if (peaksError || !peaksData?.success) {
      throw new Error(peaksError?.message || peaksData?.error || 'Failed to upload peaks');
    }

    updateTrackStatus(track.id, { 
      status: 'complete', 
      progress: 100,
      r2AudioKey: audioKey,
      r2PeaksKey: peaksData.peaksKey,
      uploadedExtension: fileExtension, // Store the actual uploaded extension
    });

    
    return { audioKey, peaksKey: peaksData.peaksKey, fileExtension };
  };

  // Upload preview WAV to R2
  const uploadPreviewWavToR2 = async (): Promise<string | null> => {
    if (!previewWavFile) return existingPreviewKey;

    setPreviewWavStatus('uploading');
    setPreviewWavProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Convert WAV to compressed format for faster streaming
      let fileToUpload = previewWavFile;
      let fileExtension = 'wav';
      
      const fileName = previewWavFile.name.toLowerCase();
      if (fileName.endsWith('.wav')) {
        setPreviewWavProgress(20);
        try {
          const conversionResult = await convertWavToM4a(previewWavFile, (progress) => {
            setPreviewWavProgress(20 + (progress * 0.3));
          });
          fileToUpload = conversionResult.file;
          fileExtension = conversionResult.file.name.split('.').pop()?.toLowerCase() || 'm4a';
        } catch (convError) {
          console.warn('Preview WAV conversion failed, uploading original:', convError);
        }
      }

      setPreviewWavProgress(50);

      const formData = new FormData();
      formData.append('audioFile', fileToUpload, `preview.${fileExtension}`);
      formData.append('songId', songId);
      formData.append('trackIndex', 'preview');
      formData.append('trackName', 'preview');
      formData.append('fileExtension', fileExtension);

      const response = await fetch(R2_UPLOAD_WORKER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Preview upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      setPreviewWavStatus('complete');
      setPreviewWavProgress(100);
      
      return result.audioKey;
    } catch (error) {
      console.error('Preview WAV upload failed:', error);
      setPreviewWavStatus('error');
      throw error;
    }
  };

  // Retry a failed track
  const retryTrack = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const trackIndex = tracks.findIndex(t => t.id === trackId);
    
    try {
      updateTrackStatus(trackId, { status: 'uploading', progress: 0, error: undefined });
      await uploadTrackToR2(track, trackIndex);
      
      toast({
        title: "Track uploaded",
        description: `${track.name} uploaded successfully`,
      });
    } catch (error) {
      console.error(`Retry failed for track ${trackIndex}:`, error);
      updateTrackStatus(trackId, { 
        status: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: "destructive",
      });
    }
  };

  // Retry all failed tracks
  const retryAllFailed = async () => {
    const failedTracks = tracks.filter(t => t.status === 'error');
    
    for (const track of failedTracks) {
      await retryTrack(track.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only require new tracks if there are no existing tracks
    if (tracks.length === 0 && existingTracks.length === 0) {
      toast({
        title: "Missing tracks",
        description: "Please add at least one audio track",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload preview WAV first if provided
      let previewAudioR2Key: string | null = existingPreviewKey;
      if (previewWavFile) {
        previewAudioR2Key = await uploadPreviewWavToR2();
      }

      // Fetch song data
      const { data: songData, error: songError } = await supabase
        .from("songs")
        .select("tempo, time_signature, title, artist")
        .eq("id", songId)
        .single();

      if (songError) throw songError;
      if (!songData) throw new Error("Song not found");

      // Start with existing tracks (they keep their original index/filename)
      const allTracks = [...existingTracks];
      
      // Upload each NEW track to R2 - STOP ON FIRST FAILURE
      const startIndex = existingTracks.length; // New tracks start after existing ones
      let successCount = 0;
      
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const trackIndex = startIndex + i; // Index in the combined array
        
        // Skip already completed tracks (from retry) - use stored extension
        if (track.status === 'complete' && track.r2AudioKey && track.r2PeaksKey) {
          const ext = track.uploadedExtension || track.file.name.split('.').pop()?.toLowerCase() || 'wav';
          allTracks.push({
            name: track.name,
            color: generateRandomColor(),
            filename: `${trackIndex}.${ext}`,
            r2_audio_key: track.r2AudioKey,
            r2_peaks_key: track.r2PeaksKey,
            default_pan: 0,
            default_volume: 1,
          });
          successCount++;
          setUploadProgress((successCount / tracks.length) * 100);
          continue;
        }

        try {
          const result = await uploadTrackToR2(track, trackIndex);

          allTracks.push({
            name: track.name,
            color: generateRandomColor(),
            filename: `${trackIndex}.${result.fileExtension}`, // Use actual uploaded extension
            r2_audio_key: result.audioKey,
            r2_peaks_key: result.peaksKey,
            default_pan: 0,
            default_volume: 1,
          });

          successCount++;
          setUploadProgress((successCount / tracks.length) * 100);
        } catch (error) {
          console.error(`Failed to upload track ${trackIndex}:`, error);
          updateTrackStatus(track.id, { 
            status: 'error', 
            progress: 0,
            error: error instanceof Error ? error.message : 'Failed to upload'
          });
          
          // STOP immediately on first failure - don't continue to next tracks
          setUploading(false);
          toast({
            title: "Upload failed",
            description: `Track "${track.name}" failed. Please retry before continuing.`,
            variant: "destructive",
          });
          return; // Exit handleSubmit entirely
        }
      }

      // Update or Insert based on whether sequencer already exists
      if (existingSequencerFileId) {
        // UPDATE existing sequencer file
        const { error: updateError } = await supabase
          .from("sequencer_files")
          .update({
            description: description || null,
            tracks: allTracks,
            preview_audio_r2_key: previewAudioR2Key,
          })
          .eq("id", existingSequencerFileId);

        if (updateError) throw updateError;

        // Update pricing
        const { error: pricingError } = await supabase
          .from("sequencer_file_pricing")
          .update({ price: parseInt(price) })
          .eq("sequencer_file_id", existingSequencerFileId);

        if (pricingError) throw pricingError;

        toast({
          title: "Success!",
          description: `Added ${tracks.length} new track(s) to sequencer`,
        });
      } else {
        // INSERT new sequencer file
        const { data: sequencerFile, error: sequencerError } = await supabase
          .from("sequencer_files")
          .insert({
            song_id: songId,
            title: songData.title,
            description: description || null,
            storage_folder_path: songId,
            storage_type: 'r2',
            tracks: allTracks,
            sequencer_data: {},
            created_by: user.id,
            tempo: songData.tempo,
            time_signature: songData.time_signature,
            preview_audio_r2_key: previewAudioR2Key,
          })
          .select("id")
          .single();

        if (sequencerError) throw sequencerError;

        // Create pricing
        const { error: pricingError } = await supabase
          .from("sequencer_file_pricing")
          .insert({
            sequencer_file_id: sequencerFile.id,
            price: parseInt(price),
            currency: "IDR",
          });

        if (pricingError) throw pricingError;

        toast({
          title: "Success!",
          description: "Sequencer uploaded to Cloudflare R2 successfully",
        });
      }

      // Reset form and close
      setPrice("50000");
      setDescription("");
      setTracks([]);
      setExistingTracks([]);
      setExistingSequencerFileId(null);
      setUploadProgress(0);
      setPreviewWavFile(null);
      setPreviewWavStatus('pending');
      setPreviewWavProgress(0);
      setExistingPreviewKey(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const hasFailedTracks = tracks.some(t => t.status === 'error');
  const allComplete = tracks.length > 0 && tracks.every(t => t.status === 'complete');
  const hasExistingTracks = existingTracks.length > 0;
  const canSubmit = !uploading && !hasFailedTracks && previewWavStatus !== 'error' && (tracks.length > 0 || previewWavFile || (hasExistingTracks && (description || price !== "50000")));

  const handlePreviewWavSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.wav') && !fileName.endsWith('.mp3') && !fileName.endsWith('.m4a')) {
        toast({
          title: "Invalid file",
          description: "Please select a WAV, MP3, or M4A file for preview",
          variant: "destructive",
        });
        return;
      }
      setPreviewWavFile(file);
      setPreviewWavStatus('pending');
      setPreviewWavProgress(0);
    }
  };

  const removePreviewWav = () => {
    setPreviewWavFile(null);
    setPreviewWavStatus('pending');
    setPreviewWavProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-orange-500" />
            {hasExistingTracks ? "Add Tracks to Sequencer" : "Upload Sequencer to R2"}
          </DialogTitle>
          <DialogDescription>
            {hasExistingTracks ? (
              <>
                Add more tracks to: <strong>{songTitle}</strong> by{" "}
                <strong>{songArtist}</strong>
                <br />
                <span className="text-xs text-green-600">
                  {existingTracks.length} existing track(s) • New tracks will be added without overwriting
                </span>
              </>
            ) : (
              <>
                Upload WAV, MP3, or M4A audio tracks for: <strong>{songTitle}</strong> by{" "}
                <strong>{songArtist}</strong>
                <br />
                <span className="text-xs text-muted-foreground">
                  Files are stored on Cloudflare R2 with CDN caching for fast global delivery.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Loading existing tracks...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this sequencer file"
                rows={3}
              />
            </div>

            {/* Preview WAV Upload Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-500" />
                Preview Audio (for Store sample)
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload a short audio clip that will play when users click "Sample" in the Sequencer Store
              </p>
              
              {existingPreviewKey && !previewWavFile && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Preview audio uploaded</p>
                    <p className="text-xs text-muted-foreground">Upload a new file to replace</p>
                  </div>
                </div>
              )}
              
              {previewWavFile ? (
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {previewWavStatus === 'complete' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : previewWavStatus === 'uploading' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500 flex-shrink-0" />
                    ) : previewWavStatus === 'error' ? (
                      <X className="w-4 h-4 text-destructive flex-shrink-0" />
                    ) : (
                      <Music className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{previewWavFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(previewWavFile.size / 1024 / 1024).toFixed(2)} MB
                        {previewWavStatus === 'uploading' && ` - ${previewWavProgress}%`}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePreviewWav}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    accept=".wav,.mp3,.m4a"
                    onChange={handlePreviewWavSelect}
                    className="hidden"
                    id="preview-wav-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="preview-wav-upload" className={`cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                    <Music className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload preview audio
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      WAV, MP3, or M4A (recommended: 20-30 seconds)
                    </p>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (IDR) *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50000"
                required
              />
            </div>

            {/* Existing Tracks Section */}
            {hasExistingTracks && (
              <div className="space-y-3">
                <Label className="text-green-600">Existing Tracks ({existingTracks.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {existingTracks.map((track, index) => (
                    <div
                      key={`existing-${index}`}
                      className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: track.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {index}. {track.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Already uploaded
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Tracks Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  {hasExistingTracks ? "Add New Tracks (WAV/MP3)" : "Audio Tracks (WAV/MP3) *"}
                </Label>
                {hasFailedTracks && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={retryAllFailed}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Retry All Failed
                  </Button>
                )}
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".wav,.mp3,.m4a"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="track-upload"
                  disabled={uploading}
                />
                <label htmlFor="track-upload" className={`cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                  <UploadIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {hasExistingTracks 
                      ? "Click to add more WAV, MP3, or M4A files"
                      : "Click to upload WAV, MP3, or M4A files"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasExistingTracks
                      ? `New tracks will be indexed starting from ${existingTracks.length}`
                      : "e.g., click.wav, cue.mp3, string.wav, keys.mp3, brass.wav"
                    }
                  </p>
                </label>
              </div>

            {tracks.length > 0 && (
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {track.status === 'complete' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : track.status === 'uploading' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                      ) : track.status === 'converting' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500 flex-shrink-0" />
                      ) : track.status === 'error' ? (
                        <X className="w-4 h-4 text-destructive flex-shrink-0" />
                      ) : (
                        <Music className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {existingTracks.length + index}. {track.name}
                          {track.status === 'converting' && <span className="text-orange-500 ml-2 text-xs">(converting to M4A...)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(track.file.size / 1024 / 1024).toFixed(2)} MB
                          {track.conversionInfo && <span className="text-green-600 ml-2">{track.conversionInfo}</span>}
                          {track.error && <span className="text-destructive ml-2">{track.error}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {track.status === 'error' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => retryTrack(track.id)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTrack(track.id)}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading to R2...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </div>

          {hasFailedTracks && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              <strong>{tracks.filter(t => t.status === 'error').length} track(s) failed to upload.</strong> 
              {' '}Please retry failed tracks before completing the upload.
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!canSubmit}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : hasFailedTracks ? (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry Failed First
                </>
              ) : allComplete || (hasExistingTracks && tracks.length === 0) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {hasExistingTracks ? (tracks.length > 0 ? "Save Changes" : "Update") : "Complete Upload"}
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  {hasExistingTracks ? "Add Tracks" : "Upload to R2"}
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
