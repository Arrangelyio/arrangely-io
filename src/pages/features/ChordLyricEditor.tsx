import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/ui/navigation";

const ChordLyricEditor = () => {
  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="text-6xl mb-6">✏️</div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
              Chord & Lyric Editor
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Intuitive editor designed specifically for worship teams. Drag-and-drop song sections, 
              format chords and lyrics perfectly, and create professional arrangements in minutes.
            </p>
          </div>

          {/* Key Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Editor Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎯 Smart Formatting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Automatically formats chords above lyrics with perfect alignment. 
                    No more manual spacing or alignment issues.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📋 Drag & Drop Sections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Easily rearrange song sections by dragging verses, choruses, 
                    and bridges to create the perfect flow.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎼 Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    See exactly how your arrangement will look during worship 
                    with our clean, performance-ready preview mode.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    💡 Smart Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get intelligent chord suggestions and common progression 
                    recommendations as you type.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📱 Multi-Device Sync
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Start editing on desktop, continue on tablet. Your work 
                    syncs seamlessly across all devices.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔄 Version History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Never lose your work. Track changes and revert to previous 
                    versions of your arrangements anytime.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Start Creating Section */}
          <div className="mb-16 text-center">
            <div className="bg-gradient-worship rounded-2xl p-8 mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Creating?</h2>
              <p className="text-white/90 mb-6 text-lg">Create professional worship arrangements in minutes</p>
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                🎵 Start New Arrangement
              </Button>
            </div>
          </div>

          {/* Interactive Demo */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Live Arrangement Demo</h2>
            <Card className="max-w-5xl mx-auto border-border shadow-worship">
              <CardHeader>
                <CardTitle className="text-primary flex justify-between items-center">
                  "Ku Diberi Kuasa" - JPCC Worship
                  <div className="flex gap-2 text-sm">
                    <span className="bg-muted px-2 py-1 rounded">Key: A</span>
                    <span className="bg-muted px-2 py-1 rounded">Tempo: 120 BPM</span>
                    <span className="bg-muted px-2 py-1 rounded">Capo: 2nd fret</span>
                  </div>
                </CardTitle>
                <CardDescription>Complete arrangement with verse, chorus, and bridge sections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      [Intro] 
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </h4>
                    <Textarea
                      className="font-mono text-sm min-h-[100px] bg-muted/50"
                      readOnly
                      value="G    C/G   G    C/G&#10;G    C/G   G    C/G&#10;G    C     Em   F&#10;G    C     Em   F"
                    />
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      [Bait / Verse] 
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </h4>
                     <div className="font-mono text-sm bg-muted/50 p-3 rounded-md border min-h-[120px]">
                       <div className="space-y-1">
                         <div>
                           <div className="text-primary font-semibold">G                    Em</div>
                           <div>Ku Dibri Kuasa Dari Raja Mulia</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">C         G/B      Am       D</div>
                           <div>Menaklukkan Musuh Di Bawah Kakiku</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">G                    Em</div>
                           <div>Kupakai Kuasa Dari Raja Mulia</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">    C              G/B       C         D</div>
                           <div>Bila Allah Ada Bersamaku Siapa Jadi Lawanku</div>
                         </div>
                       </div>
                     </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      [Reff / Chorus]
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </h4>
                     <div className="font-mono text-sm bg-muted/50 p-3 rounded-md border min-h-[160px]">
                       <div className="space-y-1">
                         <div>
                           <div className="text-primary font-semibold">      G</div>
                           <div>Sungguh Besar Kau Tuhanku</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">   Em</div>
                           <div>Engkau Perisai Hidupku</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">C         G/B</div>
                           <div>Ku Berdiri Dengan Iman</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">Am       D</div>
                           <div>Iman Dalam Yesus Tuhan</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">      G</div>
                           <div>Kau Yang Membri Kemenangan</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">    Em</div>
                           <div>Ku Bersorak Merayakan</div>
                         </div>
                         <div>
                           <div className="text-primary font-semibold">C         D</div>
                           <div>Terpujilah Engkau Raja Sgala Raja</div>
                         </div>
                       </div>
                     </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      [Interlude]
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </h4>
                    <Textarea
                      className="font-mono text-sm min-h-[80px] bg-muted/50"
                      readOnly
                      value="Em   C    G/B   D&#10;Em   C    G/B   D    E"
                    />
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      [Ending]
                      <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    </h4>
                    <Textarea
                      className="font-mono text-sm min-h-[120px] bg-muted/50"
                      readOnly
                      value="A    D    F#m   G&#10;A    D    F#m   G&#10;A/C# D    F#m   G&#10;A/C# D    F#m   G&#10;A"
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button variant="outline" size="sm">+ Add Verse</Button>
                      <Button variant="outline" size="sm">+ Add Chorus</Button>
                      <Button variant="outline" size="sm">+ Add Bridge</Button>
                      <Button variant="outline" size="sm">+ Add Interlude</Button>
                      <Button variant="outline" size="sm">+ Add Tag</Button>
                      <Button variant="outline" size="sm">+ Add Instrumental</Button>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button className="bg-gradient-worship hover:opacity-90">
                        💾 Save Arrangement
                      </Button>
                      <Button variant="outline">
                        👁️ Preview Mode
                      </Button>
                      <Button variant="outline">
                        🎵 Transpose
                      </Button>
                      <Button variant="outline">
                        📄 Export PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section Types Guide */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Available Section Types</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">[Verse]</h4>
                  <p className="text-sm text-muted-foreground">Main storytelling section with unique lyrics each time</p>
                </CardContent>
              </Card>
              
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">[Chorus]</h4>
                  <p className="text-sm text-muted-foreground">Repeated section with the main message/hook</p>
                </CardContent>
              </Card>
              
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">[Bridge]</h4>
                  <p className="text-sm text-muted-foreground">Contrasting section that builds to the final chorus</p>
                </CardContent>
              </Card>
              
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">[Interlude]</h4>
                  <p className="text-sm text-muted-foreground">Instrumental break between sections</p>
                </CardContent>
              </Card>
              
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">[Tag]</h4>
                  <p className="text-sm text-muted-foreground">Repeated ending phrase (often from chorus)</p>
                </CardContent>
              </Card>
              
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-primary mb-2">[Outro]</h4>
                  <p className="text-sm text-muted-foreground">Final section that concludes the song</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Formatting Examples */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Perfect Formatting Every Time</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-destructive">❌ Before: Manual Formatting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="text-muted-foreground">
                      C   G  Am     F<br/>
                      Amazing grace how sweet the sound<br/>
                      C  G       C<br/>
                      That saved a wretch like me
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Misaligned chords, inconsistent spacing, hard to read during worship
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-accent"> After: Smart Formatting</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div>
                      <span className="text-primary">C       G         Am      F</span><br/>
                      Amazing grace how sweet the sound<br/>
                      <span className="text-primary">C       G         C</span><br/>
                      That saved a wretch like me
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Perfect alignment, consistent spacing, easy to read at a glance
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Advanced Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Advanced Editing Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Chord Libraries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Access comprehensive chord libraries with alternative fingerings, 
                    capo positions, and simplified versions for beginning musicians.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">Guitar</Button>
                    <Button variant="outline" size="sm">Piano</Button>
                    <Button variant="outline" size="sm">Ukulele</Button>
                    <Button variant="outline" size="sm">Bass</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Tempo & Dynamics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Add tempo changes, dynamic markings, and performance notes 
                    directly in your arrangement for complete musical direction.
                  </p>
                  <div className="bg-muted p-2 rounded text-sm font-mono">
                    [Verse] - Gentle, 72 BPM<br/>
                    [Chorus] - Build, 76 BPM<br/>
                    [Bridge] - Quiet reflection
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Custom Sections</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Create custom section types like Tag, Vamp, Instrumental, 
                    or Pre-Chorus to match your unique song arrangements.
                  </p>
                  <div className="space-y-1">
                    <div className="text-sm font-mono">[Tag] - Repeat 3x</div>
                    <div className="text-sm font-mono">[Instrumental Break]</div>
                    <div className="text-sm font-mono">[Pre-Chorus]</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Export your arrangements in multiple formats: PDF for printing, 
                    slides for projection, or plain text for sharing.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">📄 PDF</Button>
                    <Button variant="outline" size="sm">📊 Slides</Button>
                    <Button variant="outline" size="sm">📝 Text</Button>
                    <Button variant="outline" size="sm">📧 Email</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" className="bg-gradient-worship hover:opacity-90 shadow-worship text-lg px-8 py-4">
              Start Creating Arrangements
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              No learning curve • Professional results in minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordLyricEditor;