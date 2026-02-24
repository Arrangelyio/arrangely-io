import { useEffect, useState } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import ArrangementEditor from "@/components/ArrangementEditor";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface ImportedData {
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature: string;
  masterSections: Record<string, { lyrics: string; chords: string }>;
  arrangementSections: Array<{
    id: number;
    type: string;
    lyrics: string;
    chords: string;
    content: string;
  }>;
  metadata: {
    confidence: number;
    duration: string;
    notes: string[];
    source: string;
  };
}

const Editor = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, creatorType, loading: userLoading } = useUserRole();
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [loading, setLoading] = useState(false);

  // State baru untuk melacak apakah ada pending request
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [pendingCheckDone, setPendingCheckDone] = useState(false);

  const editSongId = searchParams.get("edit");

  // Check if coming from Request Songs flow
  const fromRequestSongs = location.state?.fromRequestSongs || false;
  const requestData = location.state?.requestData || null;

  // MODIFIED: Check for pending requests but DO NOT REDIRECT immediately
  useEffect(() => {
    const checkPendingRequests = async () => {
      // Skip if editing existing song, coming from Request Songs, or still loading user
      if (editSongId || fromRequestSongs || userLoading || pendingCheckDone)
        return;

      // Only check for creator_arrangely users
      if (role !== "creator" || creatorType !== "creator_arrangely") {
        setPendingCheckDone(true);
        return;
      }

      try {
        const { data: pendingRequests } = await supabase
          .from("request_arrangements")
          .select("id")
          .eq("status", "pending")
          .limit(1);

        if (pendingRequests && pendingRequests.length > 0) {
          // Change logic: Don't redirect, just set the state
          setHasPendingRequests(true);

          // Optional: Info toast only (not destructive/blocking)
          // toast({
          //   title: "Pending Requests Found",
          //   description:
          //     "You have pending requests. You can only create PRIVATE songs until they are resolved.",
          //   variant: "default",
          //   duration: 5000,
          // });
        }
      } catch (error) {
        console.error("Error checking pending requests:", error);
      }

      setPendingCheckDone(true);
    };

    checkPendingRequests();
  }, [
    editSongId,
    fromRequestSongs,
    userLoading,
    role,
    creatorType,
    pendingCheckDone,
    toast,
  ]);

  // Pre-fill data from Request Songs flow
  useEffect(() => {
    if (fromRequestSongs && requestData && !editSongId) {
      const prefilledData: ImportedData = {
        title: requestData.title || "",
        artist: requestData.artist || "",
        key: "C",
        tempo: 120,
        timeSignature: "4/4",
        masterSections: {},
        arrangementSections: [],
        metadata: {
          confidence: 0,
          duration: "",
          notes: [],
          source: "request",
        },
      };

      if (requestData.youtube_link) {
        sessionStorage.setItem("prefillYoutubeLink", requestData.youtube_link);
      }

      setImportedData(prefilledData);
      setPendingCheckDone(true);
    }
  }, [fromRequestSongs, requestData, editSongId]);

  useEffect(() => {
    if (editSongId) {
      loadExistingSong(editSongId);
    } else if (!fromRequestSongs) {
      const importData = sessionStorage.getItem("youtubeImportData");
      if (importData) {
        try {
          const parsed = JSON.parse(importData);
          
          setImportedData(parsed);
          sessionStorage.removeItem("youtubeImportData");
        } catch (error) {
          console.error("Failed to parse import data:", error);
        }
      }
    }
  }, [editSongId, fromRequestSongs]);

  const loadExistingSong = async (songId: string) => {
    setLoading(true);
    try {
      const { data: songData, error: songError } = await supabase
        .from("songs")
        .select(
          `
          *,
          sections:song_sections(*),
          arrangements(
            *,
            section:song_sections(id, section_type, name)
          )
        `
        )
        .eq("id", songId)
        .single();

      if (songError) {
        console.error("Error loading song:", songError);
        return;
      }

      const masterSections: Record<string, { lyrics: string; chords: string }> =
        {};

      songData.sections?.forEach((section: any) => {
        masterSections[section.section_type] = {
          lyrics: section.lyrics || "",
          chords: section.chords || "",
        };
      });

      const arrangementSections =
        songData.arrangements
          ?.sort((a: any, b: any) => a.position - b.position)
          ?.map((arrangement: any, index: number) => ({
            id: index + 1,
            type: arrangement.section.section_type,
            lyrics:
              masterSections[arrangement.section.section_type]?.lyrics || "",
            chords:
              masterSections[arrangement.section.section_type]?.chords || "",
            content:
              masterSections[arrangement.section.section_type]?.lyrics || "",
          })) || [];

      const editData: ImportedData = {
        title: songData.title,
        artist: songData.artist || "",
        key: songData.current_key,
        tempo: songData.tempo || 120,
        timeSignature: songData.time_signature || "4/4",
        masterSections,
        arrangementSections,
        metadata: {
          confidence: 100,
          duration: "",
          notes: songData.notes ? [songData.notes] : [],
          source: "edit",
        },
      };

      
      setImportedData(editData);
    } catch (error) {
      console.error("Error loading song for editing:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logic loading disesuaikan agar tidak memblokir UI jika hanya pendingCheckDone yang belum true
  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ArrangementEditor
      importedData={importedData}
      editingSongId={editSongId}
      fromRequestSongs={fromRequestSongs}
      requestId={requestData?.id}
    />
  );
};

export default Editor;
