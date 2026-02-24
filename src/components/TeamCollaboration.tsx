import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, MessageCircle, Eye, Edit, Shield, Crown, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TeamCollaboration = () => {
  const { toast } = useToast();
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("viewer");
  const [comment, setComment] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const teamMembers = [
    { id: 1, name: "Arrangely", email: "info@arrangely.io", role: "Admin", avatar: "/avatars/john.jpg", status: "online" },
    { id: 2, name: "Sarah Wilson", email: "sarah@example.com", role: "Editor", avatar: "/avatars/sarah.jpg", status: "editing" },
    { id: 3, name: "Mike Johnson", email: "mike@example.com", role: "Viewer", avatar: "/avatars/mike.jpg", status: "offline" },
  ];

  const comments = [
    { id: 1, user: "Sarah Wilson", section: "Verse 1", comment: "Add drum build here", time: "2 min ago" },
    { id: 2, user: "Arrangely", section: "Chorus", comment: "Consider key change for energy", time: "5 min ago" },
    { id: 3, user: "Mike Johnson", section: "Bridge", comment: "Love this arrangement!", time: "10 min ago" },
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Admin": return <Crown className="h-4 w-4 text-yellow-500" />;
      case "Editor": return <Edit className="h-4 w-4 text-blue-500" />;
      case "Viewer": return <Eye className="h-4 w-4 text-gray-500" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "editing": return "bg-blue-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const handleInviteMember = () => {
    if (!newMemberEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${newMemberEmail} as ${newMemberRole}`,
    });
    setNewMemberEmail("");
    setNewMemberRole("viewer");
  };

  const handleAddComment = () => {
    if (!comment.trim() || !selectedSection) {
      toast({
        title: "Comment Incomplete",
        description: "Please select a section and add a comment.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Comment Added",
      description: `Comment added to ${selectedSection}`,
    });
    setComment("");
    setSelectedSection("");
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          {/* Hide Back to Home link in mobile view */}
          {/* {!new URLSearchParams(window.location.search).get('isMobile') && (
            <Link to="/">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          )} */}
          <h1 className="text-3xl font-bold text-primary mb-2">Team Collaboration</h1>
          <p className="text-muted-foreground">Collaborate with your team on song arrangements</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Members */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`} />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Invite New Member */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Team Member
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="colleague@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          Admin - Full access, can manage team
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4 text-blue-500" />
                          Editor - Can edit arrangements
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-500" />
                          Viewer - Can view and comment only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInviteMember} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Comments & Live Activity */}
          <div className="space-y-6">
            {/* Add Comment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Add Section Comment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intro">Intro</SelectItem>
                      <SelectItem value="verse1">Verse 1</SelectItem>
                      <SelectItem value="chorus">Chorus</SelectItem>
                      <SelectItem value="verse2">Verse 2</SelectItem>
                      <SelectItem value="bridge">Bridge</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="comment">Comment</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add your feedback or suggestion..."
                    className="min-h-[80px]"
                  />
                </div>
                <Button onClick={handleAddComment} className="w-full">
                  Add Comment
                </Button>
              </CardContent>
            </Card>

            {/* Recent Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.map((comment, index) => (
                  <div key={comment.id}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{comment.user}</p>
                        <p className="text-xs text-muted-foreground">{comment.time}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {comment.section}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{comment.comment}</p>
                    </div>
                    {index < comments.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Live Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Live Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="font-medium">Sarah Wilson</span>
                  <span className="text-muted-foreground">is editing Chorus</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-medium">Arrangely</span>
                  <span className="text-muted-foreground">joined the session</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="font-medium">Mike Johnson</span>
                  <span className="text-muted-foreground">added a comment</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCollaboration;