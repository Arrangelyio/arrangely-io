import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/ui/navigation";

const SetlistPlanner = () => {
  const [songs, setSongs] = useState([
    { id: 1, title: "Come Thou Fount", key: "G", tempo: 85, duration: "4:30", theme: "Opening" },
    { id: 2, title: "10,000 Reasons", key: "C", tempo: 120, duration: "5:15", theme: "Praise" },
    { id: 3, title: "How Great Thou Art", key: "A", tempo: 75, duration: "4:45", theme: "Worship" },
    { id: 4, title: "Amazing Grace", key: "G", tempo: 72, duration: "3:45", theme: "Response" }
  ]);

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="text-6xl mb-6">📋</div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
              Setlist Planner
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Create seamless worship experiences with intelligent setlist planning. 
              Organize songs by theme, manage key flows, and export everything your team needs.
            </p>
          </div>

          {/* Interactive Setlist Builder */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Build Your Setlist</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Setlist Details */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Service Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">Service Name</label>
                    <Input defaultValue="Sunday Morning Worship" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">Date</label>
                    <Input type="date" defaultValue="2024-01-21" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">Theme</label>
                    <Input defaultValue="Grace & Forgiveness" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">Notes</label>
                    <Textarea 
                      placeholder="Special instructions for the team..."
                      className="min-h-[80px]"
                      defaultValue="Communion Sunday - slower tempo for reflection time"
                    />
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <strong>Total Duration:</strong> 18:15
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Key Changes:</strong> 2
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Average Tempo:</strong> 88 BPM
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Song List */}
              <Card className="lg:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-primary flex justify-between items-center">
                    Setlist Order
                    <Button size="sm" className="bg-gradient-worship hover:opacity-90">
                      + Add Song
                    </Button>
                  </CardTitle>
                  <CardDescription>Drag to reorder • Click to edit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {songs.map((song, index) => (
                      <div key={song.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg hover:shadow-sm transition-all">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-medium text-primary">{song.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {song.theme}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Key: {song.key}</span>
                            <span>{song.tempo} BPM</span>
                            <span>{song.duration}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">↑</Button>
                          <Button variant="ghost" size="sm">↓</Button>
                          <Button variant="ghost" size="sm" className="text-destructive">×</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    <Button className="bg-gradient-worship hover:opacity-90">
                      Save Setlist
                    </Button>
                    <Button variant="outline">
                      Export PDF
                    </Button>
                    <Button variant="outline">
                      Create Slides
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Smart Planning Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Smart Planning Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎵 Key Flow Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Automatically suggests optimal key progressions for smooth transitions 
                    between songs. Avoid awkward key jumps.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>G → C</span>
                      <Badge className="bg-green-100 text-green-800">Smooth</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>C → A</span>
                      <Badge className="bg-yellow-100 text-yellow-800">Caution</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    ⏱️ Tempo Mapping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Visualize the energy flow of your service. Ensure natural build-ups 
                    and meaningful quiet moments.
                  </p>
                  <div className="text-sm space-y-1">
                    <div>Opening: 85 BPM (Gentle)</div>
                    <div>Praise: 120 BPM (Energetic)</div>
                    <div>Worship: 75 BPM (Reflective)</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📚 Theme Matching
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Organize songs by worship themes. Get suggestions for songs that 
                    complement your message and create cohesive experiences.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🕐 Service Timing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Track total service time including transitions. 
                    Set time limits and get alerts when you're running over.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📋 Template Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Save successful setlists as templates. Create variations for 
                    different seasons, themes, or service types.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔄 Version Control
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Track changes to setlists over time. Compare different versions 
                    and revert to previous arrangements if needed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export Options */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Export & Share Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">📄 PDF Chord Sheets</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Generate professional PDF chord sheets for each musician. 
                    Includes full arrangements, chord charts, and setlist order.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ Individual musician parts</div>
                    <div>✓ Full setlist overview</div>
                    <div>✓ Key and tempo information</div>
                    <div>✓ Service notes and comments</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">📊 Presentation Slides</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Create beautiful slides for projection. Lyrics only, 
                    or include chords for the worship team to follow.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ Clean, readable font</div>
                    <div>✓ Customizable backgrounds</div>
                    <div>✓ Multiple export formats</div>
                    <div>✓ PowerPoint compatible</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">📱 Mobile Team View</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Share a mobile-optimized view with your team. 
                    Perfect for tablets and phones during rehearsal and service.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ Responsive design</div>
                    <div>✓ Dark mode for stage use</div>
                    <div>✓ Offline access</div>
                    <div>✓ Real-time updates</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">📧 Email Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Automatically send setlists and arrangements to your team. 
                    Schedule delivery for optimal preparation time.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ Automated scheduling</div>
                    <div>✓ Custom email templates</div>
                    <div>✓ Delivery confirmations</div>
                    <div>✓ Team member preferences</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Setlist Templates */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Popular Setlist Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Traditional Service</CardTitle>
                  <CardDescription>Classic 4-song format • 20 minutes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>1. Opening Hymn</span>
                      <Badge variant="outline">Reverent</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Praise Song</span>
                      <Badge variant="outline">Uplifting</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>3. Worship Ballad</span>
                      <Badge variant="outline">Intimate</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>4. Response Song</span>
                      <Badge variant="outline">Commitment</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Use Template
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Contemporary Flow</CardTitle>
                  <CardDescription>Modern progression • 25 minutes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>1. Energetic Opener</span>
                      <Badge variant="outline">High Energy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Praise Anthem</span>
                      <Badge variant="outline">Celebratory</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>3. Transition</span>
                      <Badge variant="outline">Reflective</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>4. Intimate Worship</span>
                      <Badge variant="outline">Personal</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>5. Closing Declaration</span>
                      <Badge variant="outline">Victory</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Use Template
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Special Occasions</CardTitle>
                  <CardDescription>Easter, Christmas, etc. • 30 minutes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>1. Seasonal Opening</span>
                      <Badge variant="outline">Thematic</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Traditional Carol</span>
                      <Badge variant="outline">Familiar</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>3. Modern Interpretation</span>
                      <Badge variant="outline">Fresh</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>4. Medley/Bridge</span>
                      <Badge variant="outline">Creative</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>5. Powerful Closer</span>
                      <Badge variant="outline">Climactic</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" className="bg-gradient-worship hover:opacity-90 shadow-worship text-lg px-8 py-4">
              Start Planning Setlists
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Smart suggestions • Beautiful exports • Team collaboration included
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetlistPlanner;