import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Camera, CameraOff } from "lucide-react";
import jsQR from "jsqr";
import { useToast } from "@/hooks/use-toast";

interface QRCameraScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QRCameraScanner({ onScan, onError }: QRCameraScannerProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;

  const startScanning = async () => {
    try {
      
      setError("");

      // Basic environment checks
      if (!window.isSecureContext) {
        throw new Error('Camera access requires HTTPS context. Open the site over https://');
      }
      const inIframe = window.self !== window.top;
      if (inIframe) {
        console.warn('Running inside an iframe - camera may be blocked unless parent allows "camera" permission.');
      }
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      
      // Request camera permission with fallback
      let stream: MediaStream;
      try {
        // Prefer back camera when available
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
      } catch (backCameraError) {
        
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      
      streamRef.current = stream;
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        
        
        // Wait for video to be ready before starting scanning
        videoRef.current.onloadedmetadata = () => {
          
          setIsScanning(true);
          // Start scanning for QR codes
          intervalRef.current = setInterval(scanQRCode, 300);
        };
        
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error('❌ Video play() failed:', playErr);
          throw new Error('Camera stream started but playback was blocked. Click Start again or open in a new tab.');
        }
      }
    } catch (err) {
      console.error('❌ Camera access error:', err);
      setHasPermission(false);
      const errorMessage = err instanceof Error ? err.message : 'Unable to access camera. Please check permissions.';
      setError(errorMessage);
      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive',
      });
      onError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) {
      
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      
      return;
    }
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (canvas.width === 0 || canvas.height === 0) {
      
      return;
    }
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Get image data and try to detect QR code
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });
      
      if (code) {
        
        toast({
          title: "QR Code Scanned",
          description: "Redirecting...",
        });
        stopScanning(); // Stop scanning after successful detection
        onScan(code.data);
      }
      
    } catch (err) {
      console.error('❌ QR scanning error:', err);
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="space-y-4">
      {!isScanning ? (
        <div className="space-y-4">
          <div className="text-center p-8 border-2 border-dashed border-muted rounded-lg">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">QR Code Scanner</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click below to start scanning QR codes with your camera
            </p>
            <Button onClick={() => {
              
              startScanning();
            }}>
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
            {inIframe && (
              <p className="text-xs text-muted-foreground mt-3">
                Tip: Some browsers block camera in embedded previews. Open the app in a new tab/window and try again.
              </p>
            )}
          </div>
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Scanner overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={stopScanning}
              className="flex-1"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Camera
            </Button>
          </div>
          
          <p className="text-sm text-center text-muted-foreground">
            Point your camera at a QR code to scan
          </p>
        </div>
      )}
    </div>
  );
}