import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useContentSecurity(lessonId?: string) {
  const { toast } = useToast();

  useEffect(() => {
    if (!lessonId) return;

    let sessionCount = 0;
    let lastActivityTime = Date.now();
    let isTabActive = true;
    let screenRecordingWarned = false;

    // Monitor for multiple sessions
    const checkMultipleSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for concurrent sessions
      const { data: sessions } = await supabase
        .from("content_access_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (sessions && sessions.length > 3) {
        // Log suspicious activity
        await supabase.from("security_incidents").insert({
          user_id: user.id,
          incident_type: "multiple_concurrent_sessions",
          description: "User has multiple active sessions for the same content",
          severity: "high",
          metadata: {
            lesson_id: lessonId,
            session_count: sessions.length,
          },
        });

        toast({
          title: "Security Alert",
          description: "Multiple active sessions detected. Please use only one device at a time.",
          variant: "destructive",
        });
      }
    };

    // Monitor tab visibility to detect suspicious activity
    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
      
      if (!isTabActive) {
        // User switched tabs - might be trying to use screen recording software
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        if (timeSinceLastActivity < 30000 && !screenRecordingWarned) {
          // Quick tab switching detected
          screenRecordingWarned = true;
          toast({
            title: "Content Protection Notice",
            description: "This content is protected. Screen recording is prohibited and may result in account suspension.",
            variant: "destructive",
          });
        }
      }
      lastActivityTime = Date.now();
    };

    // Detect screen recording APIs (limited browser support)
    const detectScreenRecording = async () => {
      try {
        // Check if user has screen capture permission
        const mediaDevices = navigator.mediaDevices;
        if (mediaDevices && "getDisplayMedia" in mediaDevices) {
          // We can't directly detect if recording is happening,
          // but we can show a warning
          console.warn("Screen capture API is available");
        }
      } catch (error) {
        // Permission denied or not supported
      }
    };

    // Set up monitoring
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const sessionCheckInterval = setInterval(checkMultipleSessions, 2 * 60 * 1000); // Check every 2 minutes
    
    detectScreenRecording();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(sessionCheckInterval);
    };
  }, [lessonId, toast]);
}
