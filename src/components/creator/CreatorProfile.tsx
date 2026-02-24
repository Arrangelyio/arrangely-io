import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Users,
  Crown,
  ExternalLink,
  Copy,
  Edit,
  Instagram,
  Youtube,
  Facebook,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import PremiumBadge from "@/components/monetization/PremiumBadge";
import { CreatorIntroductionUpload } from "./CreatorIntroductionUpload";
import { supabase } from "@/integrations/supabase/client";

// Followers List Component
const FollowersList = ({
  creatorId,
  totalFollowers,
}: {
  creatorId: string;
  totalFollowers: number;
}) => {
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!creatorId) return;

      const { data, error } = await supabase
        .from("user_follows")
        .select(
          `
          follower_id,
          created_at,
          profiles!user_follows_follower_id_fkey (
            display_name,
            avatar_url,
            musical_role
          )
        `
        )
        .eq("following_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching followers:", error);
      } else {
        setFollowers(data || []);
      }
      setLoading(false);
    };

    fetchFollowers();
  }, [creatorId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Followers ({totalFollowers})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading followers...
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No followers yet
          </div>
        ) : (
          <div className="space-y-4">
            {followers.map((follow) => (
              <div key={follow.follower_id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={follow.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {follow.profiles?.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {follow.profiles?.display_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {follow.profiles?.musical_role || "Music Enthusiast"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface CreatorProfileProps {
  profile: {
    userId?: string;
    name: string;
    username: string;
    bio: string;
    followers: number;
    totalArrangements: number;
    topCreator: boolean;
    profileImage: string;
    socialLinks: {
      instagram?: string;
      youtube?: string;
      facebook?: string;
    };
    introductionVideoUrl?: string | null;
    introductionTitle?: string | null;
    introductionDescription?: string | null;
  };
  featuredArrangements: Array<{
    id: number;
    title: string;
    artist: string;
    type: "free" | "premium";
    price?: string;
    views: number;
  }>;
}

const CreatorProfile = ({
  profile,
  featuredArrangements,
}: CreatorProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(profile);
  const [followerCount, setFollowerCount] = useState(0);
  const [profileViews, setProfileViews] = useState(0);

  // Fetch dynamic follower count and analytics
  useState(() => {
    const fetchProfileStats = async () => {
      if (!profile.userId) return;

      // Fetch follower count
      const { count: followersCount } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.userId);

      if (followersCount !== null) {
        setFollowerCount(followersCount);
      }

      // For profile views, we would need a separate analytics table
      // For now, using placeholder - you can add this later
      setProfileViews(Math.floor(Math.random() * 5000) + 1000);
    };

    fetchProfileStats();
  });

  const profileUrl = `arrangely.io/creator/${profile.username}`;

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`https://${profileUrl}`);
    toast.success("Profile link copied to clipboard!");
  };

  const handleSave = async () => {
    if (!profile.userId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profileData.name,
          bio: profileData.bio,
        })
        .eq("user_id", profile.userId);

      if (error) throw error;

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Public Profile</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyProfileLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public
              </Button>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-worship hover:opacity-90"
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profileData.profileImage} />
              <AvatarFallback>{profileData.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            username: e.target.value,
                          })
                        }
                        placeholder="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      placeholder="Tell people about your worship ministry..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={profileData.socialLinks.instagram || ""}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            socialLinks: {
                              ...profileData.socialLinks,
                              instagram: e.target.value,
                            },
                          })
                        }
                        placeholder="@username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="youtube">YouTube</Label>
                      <Input
                        id="youtube"
                        value={profileData.socialLinks.youtube || ""}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            socialLinks: {
                              ...profileData.socialLinks,
                              youtube: e.target.value,
                            },
                          })
                        }
                        placeholder="Channel URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        value={profileData.socialLinks.facebook || ""}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            socialLinks: {
                              ...profileData.socialLinks,
                              facebook: e.target.value,
                            },
                          })
                        }
                        placeholder="Page URL"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-worship hover:opacity-90"
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold">{profileData.name}</h2>
                      {profileData.topCreator && (
                        <Badge className="bg-gradient-worship text-primary-foreground">
                          <Crown className="h-3 w-3 mr-1" />
                          Top Creator
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">
                      {profileUrl}
                    </p>
                    <p className="text-muted-foreground">{profileData.bio}</p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{followerCount}</span>
                      <span className="text-muted-foreground">followers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {profileData.totalArrangements}
                      </span>
                      <span className="text-muted-foreground">
                        arrangements
                      </span>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="flex gap-3">
                    {profileData.socialLinks.instagram && (
                      <Button variant="outline" size="sm">
                        <Instagram className="h-4 w-4 mr-2" />
                        Instagram
                      </Button>
                    )}
                    {profileData.socialLinks.youtube && (
                      <Button variant="outline" size="sm">
                        <Youtube className="h-4 w-4 mr-2" />
                        YouTube
                      </Button>
                    )}
                    {profileData.socialLinks.facebook && (
                      <Button variant="outline" size="sm">
                        <Facebook className="h-4 w-4 mr-2" />
                        Facebook
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Content */}
      <Tabs defaultValue="arrangements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="arrangements">Featured Arrangements</TabsTrigger>
          <TabsTrigger value="introduction">
            <Video className="h-4 w-4 mr-2" />
            Introduction Video
          </TabsTrigger>
          <TabsTrigger value="analytics">Profile Analytics</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
        </TabsList>

        {/* Introduction Video Tab */}
        <TabsContent value="introduction">
          <CreatorIntroductionUpload
            userId={profile.userId || ""}
            currentVideoUrl={profile.introductionVideoUrl}
            currentTitle={profile.introductionTitle}
            currentDescription={profile.introductionDescription}
          />
        </TabsContent>

        <TabsContent value="arrangements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Featured Arrangements</CardTitle>
              <p className="text-sm text-muted-foreground">
                These arrangements will be highlighted on your public profile
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredArrangements.map((arrangement) => (
                  <Card
                    key={arrangement.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-1">{arrangement.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {arrangement.artist}
                      </p>

                      <div className="flex items-center justify-between">
                        {arrangement.type === "premium" ? (
                          <PremiumBadge
                            variant="small"
                            price={arrangement.price!}
                          />
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Heart className="h-3 w-3" />
                          <span>{Math.floor(arrangement.views * 0.12)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Profile Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {profileViews.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Profile Views
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {followerCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Followers
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {profileData.totalArrangements}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Arrangements
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followers">
          <FollowersList
            creatorId={profile.userId || ""}
            totalFollowers={followerCount}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatorProfile;
