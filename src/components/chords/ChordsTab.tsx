"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Music, Guitar, Piano } from "lucide-react";
import GuitarChordDiagram from "./GuitarChordDiagram";
import PianoChordDiagram from "./PianoChordDiagram";
import { fetchAndCacheChords } from "./GetChordReviews";

interface ChordsTabProps {
  song: {
    sections?: Array<{
      id: string;
      section_type: string;
      chords: string | null;
      lyrics: string | null;
      name: string | null;
    }>;
    arrangements?: Array<{
      id: string;
      position: number;
      section: { id: string };
    }>;
  };
}

export default function ChordsTab({ song }: ChordsTabProps) {
  const [isGuitarView, setIsGuitarView] = useState(true);
  const [loading, setLoading] = useState(true);

  const uniqueChordNames = useMemo(() => {
    const chordSet = new Set<string>();
    const extractFromText = (text?: string | null) => {
      if (!text) return;
      const regex = /([A-G][#b]?(?:maj7?|m7?|m|M|dim7?|aug|sus[24]?|add\d*|7|9|11|13|b5|#9|b9)*(?:\/[A-G][#b]?)?)/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        chordSet.add(match[1].trim());
      }
    };
    if (song.arrangements && song.arrangements.length > 0) {
      song.arrangements.sort((a, b) => a.position - b.position).forEach((arr) => {
          const section = song.sections?.find((s) => s.id === arr.section.id);
          extractFromText(section?.chords);
          extractFromText(section?.lyrics);
        });
    } else {
      song.sections?.forEach((s) => {
        extractFromText(s.chords);
        extractFromText(s.lyrics);
      });
    }
    return Array.from(chordSet);
  }, [song]);

  useEffect(() => {
    if (uniqueChordNames.length === 0) {
      setLoading(false);
      return;
    }

    const loadChords = async () => {
      setLoading(true);
      try {
        await fetchAndCacheChords(uniqueChordNames);
      } catch (err) {
        console.error("Gagal memuat data chord:", err);
      } finally {
        setLoading(false);
      }
    };

    loadChords();
  }, [uniqueChordNames]);
  
  if (!loading && uniqueChordNames.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" /> Chords
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No chords detected in this arrangement.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4 flex flex-row justify-between items-center">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5" /> 
          <CardTitle>Chords</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {uniqueChordNames.length} chord{uniqueChordNames.length > 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Guitar className={`h-4 w-4 ${isGuitarView ? "text-primary" : "text-muted-foreground"}`} />
          <Switch
            checked={!isGuitarView}
            onCheckedChange={() => setIsGuitarView(!isGuitarView)}
          />
          <Piano className={`h-4 w-4 ${!isGuitarView ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading chords...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {uniqueChordNames.map((chordName) => 
                isGuitarView ? (
                    <GuitarChordDiagram key={chordName} chord={chordName} />
                ) : (
                    <PianoChordDiagram key={chordName} chord={chordName} />
                )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}