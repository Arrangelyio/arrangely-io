import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import Navigation from "@/components/ui/navigation";

const MobileOptimized = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState("normal");

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="text-6xl mb-6">📱</div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
              Mobile Optimized
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Perfect on every device. Whether you're on stage with a tablet, practicing with your phone, 
              or leading from your laptop - WorshipFlow works beautifully everywhere.
            </p>
          </div>

          {/* Mobile Preview Demo */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">See It In Action</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Controls */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Live Preview Controls</CardTitle>
                  <CardDescription>Try different settings to see how it looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Dark Mode</label>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Font Size</label>
                    <div className="flex gap-2">
                      <Button 
                        variant={fontSize === "small" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setFontSize("small")}
                      >
                        Small
                      </Button>
                      <Button 
                        variant={fontSize === "normal" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setFontSize("normal")}
                      >
                        Normal
                      </Button>
                      <Button 
                        variant={fontSize === "large" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setFontSize("large")}
                      >
                        Large
                      </Button>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <h4 className="font-medium text-primary mb-2">Features</h4>
                    <div className="space-y-2 text-sm">
                      <div>✓ Responsive design</div>
                      <div>✓ Touch-friendly controls</div>
                      <div>✓ Offline capability</div>
                      <div>✓ Auto-sync when online</div>
                      <div>✓ Progressive Web App</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mobile Mockup */}
              <Card className="lg:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Mobile Arrangement View</CardTitle>
                  <CardDescription>How your team sees arrangements on mobile devices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-sm mx-auto">
                    <div 
                      className={`
                        rounded-3xl border-8 border-gray-300 overflow-hidden
                        ${darkMode ? 'bg-gray-900' : 'bg-white'}
                        shadow-worship
                      `}
                      style={{ aspectRatio: '9/19.5' }}
                    >
                      {/* Phone Header */}
                      <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Amazing Grace
                          </div>
                          <Badge variant={darkMode ? "secondary" : "outline"}>Key: G</Badge>
                        </div>
                      </div>
                      
                      {/* Phone Content */}
                      <div className="p-4 space-y-4">
                        <div>
                          <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            [Verse 1]
                          </div>
                          <div 
                            className={`font-mono leading-relaxed ${
                              fontSize === 'small' ? 'text-xs' : 
                              fontSize === 'large' ? 'text-sm' : 'text-xs'
                            }`}
                          >
                            <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-1`}>
                              G       G/F#    Em      G/D
                            </div>
                            <div className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                              Amazing grace how sweet the sound
                            </div>
                            <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-1 mt-2`}>
                              C       G/B     Am      D
                            </div>
                            <div className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                              That saved a wretch like me
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            [Chorus]
                          </div>
                          <div 
                            className={`font-mono leading-relaxed ${
                              fontSize === 'small' ? 'text-xs' : 
                              fontSize === 'large' ? 'text-sm' : 'text-xs'
                            }`}
                          >
                            <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-1`}>
                              G       Em      C       D
                            </div>
                            <div className={darkMode ? 'text-gray-100' : 'text-gray-900'}>
                              How sweet the name of Jesus sounds
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Phone Footer */}
                      <div className={`absolute bottom-0 left-0 right-0 p-3 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex justify-between items-center text-xs">
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            72 BPM • 2/4
                          </span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            Swipe for next song
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Mobile-First Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    👆 Touch-Optimized Interface
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Large tap targets, swipe gestures, and finger-friendly controls. 
                    Designed for musicians wearing gloves or in low-light situations.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>✓ Swipe between songs</div>
                    <div>✓ Pinch to zoom text</div>
                    <div>✓ Tap to highlight sections</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🌙 Performance Mode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Dark mode optimized for stage lighting. High contrast text 
                    remains readable even under bright stage lights.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>✓ Dark theme for low light</div>
                    <div>✓ High contrast ratios</div>
                    <div>✓ Reduced blue light</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📶 Offline Capability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Download setlists for offline access. No internet? No problem. 
                    Your arrangements are always available when you need them.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>✓ Offline viewing</div>
                    <div>✓ Auto-download setlists</div>
                    <div>✓ Sync when reconnected</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔄 Real-Time Sync
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Changes made on desktop instantly appear on mobile. 
                    Last-minute arrangement updates reach your team immediately.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎯 Smart Formatting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Automatically adjusts layout for different screen sizes. 
                    Chords and lyrics remain perfectly aligned on any device.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔋 Battery Optimized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Efficient code and smart caching preserve battery life. 
                    Your device stays powered through the entire service.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Device Compatibility */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Works on Every Device</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-border text-center">
                <CardHeader>
                  <div className="text-4xl mb-4">📱</div>
                  <CardTitle className="text-primary">Smartphones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Perfect for quick reference and practice sessions. 
                    Fits in your pocket, always accessible.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>✓ iPhone (iOS 12+)</div>
                    <div>✓ Android (7.0+)</div>
                    <div>✓ Progressive Web App</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border text-center">
                <CardHeader>
                  <div className="text-4xl mb-4">📲</div>
                  <CardTitle className="text-primary">Tablets</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Ideal for stage use. Large, clear display perfect 
                    for reading arrangements during worship.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>✓ iPad (9.7" and larger)</div>
                    <div>✓ Android tablets</div>
                    <div>✓ Surface tablets</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border text-center">
                <CardHeader>
                  <div className="text-4xl mb-4">💻</div>
                  <CardTitle className="text-primary">Laptops & Desktops</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Full-featured editing experience. Create and 
                    manage arrangements with complete control.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div>✓ Chrome, Firefox, Safari</div>
                    <div>✓ Windows, Mac, Linux</div>
                    <div>✓ Full editing capabilities</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Progressive Web App Benefits */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Progressive Web App Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">🏠 Install Like a Native App</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Add WorshipFlow to your home screen. Launches instantly like a native app, 
                    but with all the benefits of web technology.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ No app store required</div>
                    <div>✓ Automatic updates</div>
                    <div>✓ Full-screen experience</div>
                    <div>✓ Push notifications</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">⚡ Lightning Fast Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Smart caching and efficient code mean instant loading. 
                    Arrangements appear immediately, even on slower networks.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ Instant startup</div>
                    <div>✓ Smooth animations</div>
                    <div>✓ Efficient data usage</div>
                    <div>✓ Background sync</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">🔒 Secure & Private</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Your arrangements are encrypted and securely stored. 
                    Works offline while keeping your data private and safe.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ End-to-end encryption</div>
                    <div>✓ Local data storage</div>
                    <div>✓ HTTPS everywhere</div>
                    <div>✓ Privacy-first design</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">🌐 Always Up to Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Automatic updates ensure you always have the latest features. 
                    No manual updates or app store approvals required.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>✓ Seamless updates</div>
                    <div>✓ New features instantly</div>
                    <div>✓ Bug fixes immediately</div>
                    <div>✓ Cross-device consistency</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Perfect for Every Situation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-primary">🎤 On Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Mount tablet on music stand. Large, clear text visible 
                    even under stage lights. Dark mode reduces glare.
                  </p>
                  <Badge className="bg-accent/20 text-accent-foreground">Stage-Ready</Badge>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-primary">🏠 Practice at Home</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Pull up arrangements on phone while practicing. 
                    Adjust tempo, transpose keys, and add personal notes.
                  </p>
                  <Badge className="bg-primary/20 text-primary">Practice-Perfect</Badge>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-primary">🚗 In Transit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Review setlists while traveling to church. 
                    Offline access means no internet worries.
                  </p>
                  <Badge className="bg-secondary/50 text-secondary-foreground">Travel-Ready</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" className="bg-gradient-worship hover:opacity-90 shadow-worship text-lg px-8 py-4">
              Try on Your Device
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Works on any device • No downloads required • Install as app optional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileOptimized;