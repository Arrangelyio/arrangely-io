import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ARRANGELY_PROTOCOL = "arrangely://";
const FALLBACK_TIMEOUT_MS = 2000;

export function useAppLauncher() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const openArrangelyApp = async (songId?: string) => {
    // Build the protocol URL
    const protocolUrl = songId 
      ? `${ARRANGELY_PROTOCOL}open?song=${songId}` 
      : `${ARRANGELY_PROTOCOL}open`;
    
    // Track if we successfully opened the app
    let appOpened = false;
    
    // Set a timeout to redirect to download page if app doesn't open
    const fallbackTimer = setTimeout(() => {
      if (!appOpened) {
        // Protocol failed - app likely not installed
        navigate("/download-app");
      }
    }, FALLBACK_TIMEOUT_MS);

    // Create a hidden iframe to try launching the app via custom protocol
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = protocolUrl;
    document.body.appendChild(iframe);

    // Listen for window blur (indicates app opened successfully)
    const handleBlur = () => {
      appOpened = true;
      clearTimeout(fallbackTimer);
      cleanup();
      toast({
        title: "Opening Arrangely Live",
        description: "Launching the desktop app...",
      });
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        appOpened = true;
        clearTimeout(fallbackTimer);
        cleanup();
      }
    };

    const cleanup = () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup after timeout regardless of outcome
    setTimeout(() => {
      cleanup();
    }, FALLBACK_TIMEOUT_MS + 500);
  };

  return { openArrangelyApp };
}
