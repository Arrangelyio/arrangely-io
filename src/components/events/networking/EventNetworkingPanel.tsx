import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, User } from "lucide-react";

interface EventNetworkingPanelProps {
  eventId: string;
  registrationId: string;
}

export function EventNetworkingPanel({ eventId, registrationId }: EventNetworkingPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInList, setShowInList] = useState(false);
  const [profile, setProfile] = useState({
    company: "",
    job_title: "",
    bio: "",
    linkedin_url: "",
    interests: "",
  });

  useEffect(() => {
    fetchProfile();
  }, [registrationId]);

  const fetchProfile = async () => {
    try {
      const { data: regData, error: regError } = await supabase
        .from("event_registrations")
        .select("show_in_attendee_list")
        .eq("id", registrationId)
        .single();

      if (regError) throw regError;
      setShowInList(regData.show_in_attendee_list || false);

      const { data: profileData, error: profileError } = await supabase
        .from("event_attendee_profiles")
        .select("*")
        .eq("registration_id", registrationId)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      if (profileData) {
        setProfile({
          company: profileData.company || "",
          job_title: profileData.job_title || "",
          bio: profileData.bio || "",
          linkedin_url: profileData.linkedin_url || "",
          interests: profileData.interests?.join(", ") || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      await supabase
        .from("event_registrations")
        .update({ show_in_attendee_list: showInList })
        .eq("id", registrationId);

      const interestsArray = profile.interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i);

      const { error } = await supabase.from("event_attendee_profiles").upsert({
        registration_id: registrationId,
        user_id: userData.user?.id,
        company: profile.company,
        job_title: profile.job_title,
        bio: profile.bio,
        linkedin_url: profile.linkedin_url,
        interests: interestsArray,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Networking profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Networking Profile</CardTitle>
          <CardDescription>
            Share your information with other attendees to facilitate networking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show in Attendee List</Label>
              <p className="text-sm text-muted-foreground">
                Make your profile visible to other attendees
              </p>
            </div>
            <Switch checked={showInList} onCheckedChange={setShowInList} />
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              placeholder="Your company name"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input
              placeholder="Your job title"
              value={profile.job_title}
              onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              placeholder="Tell others about yourself..."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input
              placeholder="https://linkedin.com/in/yourprofile"
              value={profile.linkedin_url}
              onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Interests (comma-separated)</Label>
            <Input
              placeholder="Technology, Marketing, AI"
              value={profile.interests}
              onChange={(e) => setProfile({ ...profile, interests: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
