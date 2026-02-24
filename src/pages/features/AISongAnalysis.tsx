import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


const AISongAnalysis = () => {
  return (
    <div className="min-h-screen bg-gradient-sanctuary pt-16">
      <div className="pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="text-6xl mb-6">🎵</div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
              AI Song Analysis
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Upload any worship song and let our AI automatically detect chord progressions, 
              song structure, key signatures, and tempo. Save hours of manual transcription work.
            </p>
          </div>

          {/* How It Works */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300 animate-fade-in">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-primary-foreground">1</span>
                  </div>
                  <CardTitle className="text-primary">Upload or Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Upload an MP3 file or paste a YouTube link. Our AI works with any audio quality.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300 animate-fade-in">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-primary-foreground">2</span>
                  </div>
                  <CardTitle className="text-primary">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Advanced AI algorithms analyze the audio to detect chords, structure, key, and tempo.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300 animate-fade-in">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-primary-foreground">3</span>
                  </div>
                  <CardTitle className="text-primary">Edit & Refine</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Review the AI-generated arrangement and make any adjustments needed for your team.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">AI Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎸 Chord Recognition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Accurately identifies chord progressions throughout the entire song, 
                    including complex jazz chords and suspended chords.
                  </p>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="text-primary font-semibold mb-2">[Verse]</div>
                    <div>C       G/B     Am      F</div>
                    <div>Amazing grace how sweet the sound</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🏗️ Song Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Automatically detects and labels song sections like verses, choruses, 
                    bridges, and instrumental breaks.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Intro</Badge>
                    <Badge variant="outline">Verse 1</Badge>
                    <Badge variant="outline">Chorus</Badge>
                    <Badge variant="outline">Verse 2</Badge>
                    <Badge variant="outline">Bridge</Badge>
                    <Badge variant="outline">Chorus x2</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔑 Key Detection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Identifies the song's key signature and suggests alternative keys 
                    that work well for different vocal ranges.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-gradient-worship">Original: G Major</Badge>
                    <Badge variant="outline">Suggested: A Major</Badge>
                    <Badge variant="outline">Alternative: F Major</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎵 Tempo Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Detects the song's BPM and identifies tempo changes throughout 
                    the song for accurate rhythm guidance.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-primary font-semibold">Detected: 72 BPM</div>
                    <div className="text-sm text-muted-foreground">Slow worship ballad</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Example Output */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Example AI Output</h2>
            <Card className="max-w-4xl mx-auto border-border shadow-worship">
              <CardHeader>
                <CardTitle className="text-primary">Amazing Grace - AI Generated Arrangement</CardTitle>
                <CardDescription>Analyzed from: youtube.com/watch?v=example</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Song Details</h4>
                    <div className="space-y-1 text-sm">
                      <div>Key: G Major</div>
                      <div>Tempo: 72 BPM</div>
                      <div>Time Signature: 4/4</div>
                      <div>Duration: 3:45</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-2">Structure</h4>
                    <div className="space-y-1 text-sm">
                      <div>Intro (8 bars)</div>
                      <div>Verse 1 (16 bars)</div>
                      <div>Verse 2 (16 bars)</div>
                      <div>Verse 3 (16 bars)</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <div className="text-primary font-semibold mb-2">[Verse]</div>
                  <div className="mb-1">G       G/F#    Em      G/D</div>
                  <div className="mb-3">Amazing grace how sweet the sound</div>
                  <div className="mb-1">C       G/B     Am      D</div>
                  <div className="mb-3">That saved a wretch like me</div>
                  <div className="mb-1">G       G/F#    Em      G/D</div>
                  <div className="mb-3">I once was lost but now I'm found</div>
                  <div className="mb-1">C       G/B     Am  D   G</div>
                  <div>Was blind but now I see</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" className="bg-gradient-worship hover:opacity-90 shadow-worship text-lg px-8 py-4">
              Try AI Analysis Now
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • Analyze your first 3 songs free
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISongAnalysis;