import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navigation from "@/components/ui/navigation";

const TeamCollaboration = () => {
  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="text-6xl mb-6">👥</div>
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
              Team Collaboration
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Bring your entire worship team together. Collaborate in real-time, assign roles, 
              add comments, and ensure everyone is prepared for Sunday morning.
            </p>
          </div>

          {/* Team Roles Demo */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Team Roles & Permissions</h2>
            <Card className="max-w-4xl mx-auto border-border shadow-worship">
              <CardHeader>
                <CardTitle className="text-primary">Worship Team - Sunday Service</CardTitle>
                <CardDescription>Amazing Grace arrangement - 5 team members collaborating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-gradient-worship text-primary-foreground">JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">John Davis</p>
                        <p className="text-sm text-muted-foreground">Worship Director</p>
                      </div>
                    </div>
                    <Badge className="bg-gradient-worship">Admin</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/20">SJ</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Sarah Johnson</p>
                        <p className="text-sm text-muted-foreground">Lead Guitarist</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Editor</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-accent/20">MT</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Mike Thompson</p>
                        <p className="text-sm text-muted-foreground">Drummer</p>
                      </div>
                    </div>
                    <Badge variant="outline">Viewer</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-accent/20">LW</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Lisa Williams</p>
                        <p className="text-sm text-muted-foreground">Pianist</p>
                      </div>
                    </div>
                    <Badge variant="outline">Viewer</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/20">DB</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">David Brown</p>
                        <p className="text-sm text-muted-foreground">Bassist</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Editor</Badge>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-primary/5 rounded">
                    <p className="font-medium text-primary">Admin</p>
                    <p className="text-muted-foreground">Full access, team management</p>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded">
                    <p className="font-medium text-primary">Editor</p>
                    <p className="text-muted-foreground">Edit arrangements, add comments</p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p className="font-medium text-primary">Viewer</p>
                    <p className="text-muted-foreground">View and comment only</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collaboration Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Collaboration Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    💬 Section Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Add comments to specific song sections. "Drum build here" or 
                    "Quiet for verse 2" - keep everyone on the same page.
                  </p>
                  <div className="bg-muted p-3 rounded text-sm">
                    <div className="font-medium text-primary mb-1">[Chorus] - Sarah Johnson</div>
                    <div className="text-muted-foreground">"Let's add a guitar solo after the 2nd chorus"</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔄 Real-Time Editing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    See changes as they happen. Multiple team members can edit 
                    the same arrangement simultaneously without conflicts.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📝 Version History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Track all changes with complete version history. 
                    See who made what changes and revert if needed.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🔔 Smart Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get notified when arrangements are updated, comments are added, 
                    or setlists are published for Sunday.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    📋 Task Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Assign specific tasks to team members. "Practice bridge solo" 
                    or "Learn new chord progression" with due dates.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    🎵 Practice Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Share practice tracks, click tracks, and reference recordings 
                    with your team for better preparation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comments Demo */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Section Comments in Action</h2>
            <Card className="max-w-4xl mx-auto border-border shadow-worship">
              <CardHeader>
                <CardTitle className="text-primary">Amazing Grace - Arrangement Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-primary">[Verse 1]</h4>
                      <Button variant="outline" size="sm">+ Add Comment</Button>
                    </div>
                    <div className="bg-muted p-3 rounded font-mono text-sm mb-4">
                      <div className="text-primary">G       G/F#    Em      G/D</div>
                      <div>Amazing grace how sweet the sound</div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex gap-3 p-3 bg-accent-soft rounded">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-gradient-worship text-primary-foreground">JD</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">John Davis</span>
                            <span className="text-xs text-muted-foreground">2 hours ago</span>
                          </div>
                          <p className="text-sm">Start very gently, almost whispered. Let the congregation settle in.</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 p-3 bg-secondary/30 rounded">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/20">SJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">Sarah Johnson</span>
                            <span className="text-xs text-muted-foreground">1 hour ago</span>
                          </div>
                          <p className="text-sm">Should I play fingerpicking or light strumming for the intro?</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-semibold text-primary mb-3">[Bridge]</h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm mb-4">
                      <div className="text-primary">C       G/B     Am      G</div>
                      <div>When we've been there ten thousand years</div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-accent-soft rounded">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-accent/20">MT</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">Mike Thompson</span>
                          <span className="text-xs text-muted-foreground">30 minutes ago</span>
                        </div>
                        <p className="text-sm">Perfect spot for a big drum build! Start subtle and crescendo through the bridge.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Workflow */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Team Workflow</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <Card className="border-border text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-primary-foreground">1</span>
                  </div>
                  <CardTitle className="text-primary">Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Worship director creates setlist and invites team members
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-primary-foreground">2</span>
                  </div>
                  <CardTitle className="text-primary">Collaborate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Team members add comments, suggest changes, and practice together
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-primary-foreground">3</span>
                  </div>
                  <CardTitle className="text-primary">Finalize</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Make final adjustments and mark arrangements as ready for Sunday
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border text-center">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-primary-foreground">4</span>
                  </div>
                  <CardTitle className="text-primary">Worship</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Everyone has the same arrangement, comments, and is prepared to lead worship
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Advanced Team Features */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary text-center mb-12">Advanced Team Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Multi-Team Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Manage multiple worship teams (Saturday evening, Sunday morning, youth) 
                    with different arrangements and members.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline">Saturday Team (5 members)</Badge>
                    <Badge variant="outline">Sunday Morning (8 members)</Badge>
                    <Badge variant="outline">Youth Worship (4 members)</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Guest Musician Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Easily invite guest musicians with temporary access to specific 
                    arrangements and setlists when regular team members are unavailable.
                  </p>
                  <Button variant="outline" size="sm">+ Invite Guest</Button>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Practice Scheduling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Schedule rehearsals, track attendance, and send reminders. 
                    Integrated with your team's calendar for seamless planning.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Next rehearsal: Thursday 7:00 PM<br/>
                    5/6 members confirmed
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border hover:shadow-worship transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-primary">Skill Level Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Tag arrangements by difficulty level. Ensure new team members 
                    get appropriate songs while challenging experienced musicians.
                  </p>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-800">Beginner</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">Intermediate</Badge>
                    <Badge className="bg-red-100 text-red-800">Advanced</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" className="bg-gradient-worship hover:opacity-90 shadow-worship text-lg px-8 py-4">
              Start Team Collaboration
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Free for teams up to 5 members • Unlimited arrangements • Real-time sync
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCollaboration;