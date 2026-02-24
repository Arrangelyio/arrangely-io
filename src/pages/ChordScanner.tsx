import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ScanLine, Upload, FileText, Music } from "lucide-react";
import DynamicNavigation from "@/components/DynamicNavigation";
import ImageChordImport from "@/components/chord-grid/ImageChordImport";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { handwritingToGrid } from "@/utils/handwritingToGrid";

const ChordScanner: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserRole();
  const [showImport, setShowImport] = useState(false);

  const handleApply = async (
    text: string,
    metadata: {
      title: string;
      artist: string;
      songKey: string;
      tempo: number;
      timeSignature: string;
    }
  ) => {
    // 1. Cek Login
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to save chord grids.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 2. Parsing Teks Mentah dari OCR
      const rawSections = handwritingToGrid(text);

      // Regex untuk menghapus simbol garis tabel, kurung, dll
      const cleanRegex = /[|\[\](){}│┃¦]/g;

      // 3. PEMBERSIHAN DATA (Sanitizing) + SPLITTING LOGIC
      const cleanSections = rawSections.map((section: any) => ({
        ...section,
        bars: section.bars
          .map((bar: any) => {
            // Ambil text mentah, hapus simbol aneh, trim whitespace
            const rawChord = bar.chord
              ? bar.chord.replace(cleanRegex, "").trim()
              : "";

            // LOGIKA BARU: Split string jika ada beberapa chord (misal "C . F .")
            // Filter: hapus titik (.) dan slash (/) yang berdiri sendiri
            // serta pastikan tidak ada string kosong
            const parts = rawChord
              .split(/\s+/)
              .filter((p: string) => p !== "." && p !== "/" && p.trim() !== "");

            let chord = "";
            // Cek apakah utility handwritingToGrid sudah mendeteksi chordAfter/chordEnd
            let chordAfter = bar.chordAfter
              ? bar.chordAfter.replace(cleanRegex, "").trim()
              : undefined;
            let chordEnd = bar.chordEnd
              ? bar.chordEnd.replace(cleanRegex, "").trim()
              : undefined;

            if (parts.length > 0) {
              // Jika terdeteksi multiple chords dalam satu string (dan slot lain masih kosong)
              // Contoh kasus: "C F" atau "C . F ."
              if (parts.length > 1 && !chordAfter && !chordEnd) {
                chord = parts[0];      // Chord pertama (Beat 1)
                chordAfter = parts[1]; // Chord kedua (Beat 3 / Tengah)
                if (parts.length > 2) {
                  chordEnd = parts[2]; // Chord ketiga (Beat Akhir / 4)
                }
              } else {
                // Jika cuma 1 bagian, pakai itu sebagai chord utama
                chord = parts[0];
              }
            } else {
              // Fallback jika kosong atau gagal split, gunakan rawChord
              chord = rawChord;
            }

            return {
              ...bar,
              chord,
              chordAfter,
              chordEnd,
            };
          })
          // Hapus bar yang benar-benar kosong setelah pembersihan
          // Kita cek semua slot (chord, chordAfter, chordEnd)
          .filter(
            (bar: any) =>
              bar.chord !== "" ||
              (bar.chordAfter && bar.chordAfter !== "") ||
              (bar.chordEnd && bar.chordEnd !== "")
          ),
      }));

      // 4. Simpan Data Lagu (Parent Table: songs)
      const { data: songData, error: songError } = await supabase
        .from("songs")
        .insert({
          title: metadata.title || "Untitled Scan",
          artist: metadata.artist || null,
          current_key: metadata.songKey || "C",
          original_key: metadata.songKey || "C",
          tempo: metadata.tempo || 120,
          time_signature: metadata.timeSignature || "4/4",
          theme: "chord_grid",
          is_public: false,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (songError) throw songError;

      // 5. Simpan Bagian Lagu (Child Table: song_sections)
      if (cleanSections.length > 0) {
        const sectionsPayload = cleanSections.map(
          (section: any, index: number) => ({
            song_id: songData.id,
            name: section.name || `Section ${index + 1}`,
            section_type: "verse",
            // Simpan bars yang sudah bersih dan terstruktur
            lyrics: JSON.stringify(section.bars),
            bar_count: section.bars.length,
            section_time_signature: metadata.timeSignature || "4/4",
          })
        );

        const { error: sectionError } = await supabase
          .from("song_sections")
          .insert(sectionsPayload);

        if (sectionError) throw sectionError;
      }

      toast({
        title: "Saved!",
        description: "Chord grid saved to your library.",
      });

      // 6. Redirect ke Generator dengan ID lagu baru
      navigate(`/chord-grid-generator?songId=${songData.id}`);
      
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Save Failed",
        description: err.message || "Could not save chord grid.",
        variant: "destructive",
      });
    }
  };

  if (showImport) {
    return (
      <div className="min-h-screen bg-background">
        <DynamicNavigation isMobileView={false} />
        <div className="container max-w-4xl mx-auto py-4 px-4">
          <ImageChordImport
            onApply={handleApply}
            onClose={() => setShowImport(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DynamicNavigation isMobileView={false} />
      <div className="container max-w-lg mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chord Scanner</h1>
            <p className="text-sm text-muted-foreground">Convert any chord chart to a structured grid</p>
          </div>
        </div>

        <div className="grid gap-4">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowImport(true)}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ScanLine className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Scan / Upload Image</h3>
                <p className="text-sm text-muted-foreground">
                  Take a photo or upload a screenshot of a chord chart
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowImport(true)}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-xl bg-accent/50 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Paste Text</h3>
                <p className="text-sm text-muted-foreground">
                  Paste chord chart text from notes, messages, or AI output
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate("/chord-grid-generator")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Music className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Create Manually</h3>
                <p className="text-sm text-muted-foreground">
                  Open the chord grid editor and build from scratch
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChordScanner;
