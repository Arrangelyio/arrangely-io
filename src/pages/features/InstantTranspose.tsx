import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/ui/navigation";

const InstantTranspose = () => {
  const [fromKey, setFromKey] = useState("G");
  const [toKey, setToKey] = useState("A");
  
  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  const chordProgressions = {
    "G": ["G", "Em", "C", "D"],
    "A": ["A", "F#m", "D", "E"],
    "C": ["C", "Am", "F", "G"],
    "D": ["D", "Bm", "G", "A"],
    "F": ["F", "Dm", "Bb", "C"]
  };

  const getCurrentProgression = () => {
    return chordProgressions[fromKey as keyof typeof chordProgressions] || ["G", "Em", "C", "D"];
  };

  const getTransposedProgression = () => {
    return chordProgressions[toKey as keyof typeof chordProgressions] || ["A", "F#m", "D", "E"];
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="text-6xl mb-6">🎸</div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
              Instant Transpose
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Change keys instantly for different vocalists. Get capo recommendations, 
              simplified chord versions, and perfect transpositions every time.
            </p>
          </div>

          {/* Interactive Transpose Demo */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Try It Now</h2>
            <Card className="max-w-4xl mx-auto border-border shadow-worship">
              <CardHeader>
                <CardTitle className="text-primary">Transpose Demo - Amazing Grace</CardTitle>
                <CardDescription>Change the key and see the chords update instantly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">From Key:</label>
                    <Select value={fromKey} onValueChange={setFromKey}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keys.map(key => (
                          <SelectItem key={key} value={key}>{key} Major</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">To Key:</label>
                    <Select value={toKey} onValueChange={setToKey}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {keys.map(key => (
                          <SelectItem key={key} value={key}>{key} Major</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-primary mb-4">Original ({fromKey} Major)</h4>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      <div className="mb-2">
                        <span className="text-primary">{getCurrentProgression().join("     ")}</span>
                      </div>
                      <div className="text-muted-foreground">Amazing grace how sweet the sound</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-accent mb-4">Transposed ({toKey} Major)</h4>
                    <div className="bg-accent-soft p-4 rounded-lg font-mono text-sm border-2 border-accent/20">
                      <div className="mb-2">
                        <span className="text-accent-foreground font-bold">{getTransposedProgression().join("     ")}</span>
                      </div>
                      <div className="text-accent-foreground/80">Amazing grace how sweet the sound</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Capo Suggestion</h4>
                  <p className="text-sm text-muted-foreground">
                    To play {toKey} major using {fromKey} major chord shapes: <Badge className="ml-2">Capo 2nd fret</Badge>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Transpose Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    ⚡ Instant Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Change keys with a single click. See your entire arrangement 
                    update instantly across all sections.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎯 Smart Capo Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get automatic capo position recommendations to play new keys 
                    using familiar chord shapes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎼 Multiple Instruments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Transpose for guitar, piano, bass, or any instrument. 
                    Each gets optimized chord voicings.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📝 Simplified Chords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Option to simplify complex chords (Bm7→Bm) for beginning 
                    musicians while maintaining the song's harmony.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎵 Key Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get suggestions for male/female vocal ranges and 
                    congregation-friendly keys for different songs.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔄 Batch Transpose
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Transpose entire setlists at once to create consistent 
                    key flows throughout your worship service.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Vocal Range Guide */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Vocal Range Guide</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Male Vocal Ranges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Bass</span>
                      <Badge variant="outline">E2 - E4</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Baritone</span>
                      <Badge variant="outline">A2 - A4</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Tenor</span>
                      <Badge variant="outline">C3 - C5</Badge>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-primary/5 rounded">
                    <p className="text-sm text-primary">
                      <strong>Recommended keys:</strong> D, E, F, G
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Female Vocal Ranges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Alto</span>
                      <Badge variant="outline">G3 - G5</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Mezzo-Soprano</span>
                      <Badge variant="outline">A3 - A5</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Soprano</span>
                      <Badge variant="outline">C4 - C6</Badge>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-accent/5 rounded">
                    <p className="text-sm text-accent-foreground">
                      <strong>Recommended keys:</strong> A, Bb, C, D
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Common Transpose Scenarios */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Common Scenarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">🎤 Male to Female Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Song originally in G (male range) needs to go to Bb or C for female vocalist.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>G → Bb</span>
                      <Badge variant="outline">+3 semitones</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>G → C</span>
                      <Badge variant="outline">+5 semitones</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">🎸 Easier Guitar Chords</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Song has difficult barre chords, transpose to use open chord shapes.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>F → G (no barre)</span>
                      <Badge className="bg-accent">Easier</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Bb → C (no barre)</span>
                      <Badge className="bg-accent">Easier</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">👥 Congregation Singing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Adjust key so congregation can comfortably sing along.
                  </p>
                  <div className="bg-primary/5 p-3 rounded">
                    <p className="text-sm text-primary">
                      <strong>Sweet Spot:</strong> G, A, or Bb major<br/>
                      <span className="text-muted-foreground">Comfortable for most people</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">🎹 Piano-Friendly Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Some keys are more natural for piano players to play in.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">C major - All white keys</Badge>
                    <Badge variant="outline">G major - One sharp</Badge>
                    <Badge variant="outline">F major - One flat</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" className="bg-gradient-worship hover:opacity-90 shadow-worship text-lg px-8 py-4">
              Try Instant Transpose
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Perfect transpositions • Capo suggestions • Vocal range optimization
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstantTranspose;