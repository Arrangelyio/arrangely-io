import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2, Edit, Save, X, Lock, Music, Camera, CheckCircle, Upload, MessageSquare } from "lucide-react";
import DeleteAccountSection from "@/components/profile/DeleteAccountSection";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import PremiumBadge from "@/components/monetization/PremiumBadge";
import VerifiedBadge from "@/components/ui/verified-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { App } from "@capacitor/app";
declare const __APP_VERSION__: string;

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ public: 0, privateOwn: 0, privateFromCreators: 0 });
  const [chatSettings, setChatSettings] = useState({ is_enabled: true });
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    musical_role: '',
    usage_context: '',
    experience_level: '',
    instruments: [] as string[],
    phone_number: '',
    city: '',
    country: '',
    hear_about_us: '',
    youtube_channel: '',
    first_name: '',
    last_name: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { role, isCreator, creatorType } = useUserRole();
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscription();
  const isMobileView = useIsMobile();
  const [appVersion, setAppVersion] = useState<string>("");
  const [buildNumber, setBuildNumber] = useState<string>("");

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const info = await App.getInfo();
        setAppVersion(info.version);      // versionName
        setBuildNumber(info.build);       // versionCode
      } catch (err) {
        console.log("Not running in native platform");
      }
    };

    loadVersion();
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setFormData({
            display_name: profileData.display_name || '',
            bio: profileData.bio || '',
            musical_role: profileData.musical_role || '',
            usage_context: profileData.usage_context || '',
            experience_level: profileData.experience_level || '',
            instruments: profileData.instruments || [],
            phone_number: (profileData as any).phone_number || '',
            city: (profileData as any).city || '',
            country: (profileData as any).country || '',
            hear_about_us: (profileData as any).hear_about_us || '',
            youtube_channel: (profileData as any).youtube_channel || '',
            first_name: (profileData as any).first_name || '',
            last_name: (profileData as any).last_name || ''
          });
          
          // Load avatar if exists
          if (profileData.avatar_url) {
            setAvatarUrl(profileData.avatar_url);
          } else {
            // Try to get avatar from storage
            const avatarPath = `${user.id}/avatar.jpg`;
            const { data } = supabase.storage.from('profile-photos').getPublicUrl(avatarPath);
            if (data?.publicUrl) {
              setAvatarUrl(data.publicUrl);
            }
          }
        }

        // Get arrangement statistics
        const { data: publicSongs } = await supabase
          .from('songs')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_public', true);

        // Get private songs created by user (no original_creator_id AND not from Arrangely)
        const { data: privateOwnSongs } = await supabase
          .from('songs')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_public', false)
          .is('original_creator_id', null)
          .neq('created_sign', 'Arrangely');

        // Get private songs duplicated from creators (has original_creator_id OR created_sign is Arrangely)
        const { data: privateFromCreatorSongs } = await supabase
          .from('songs')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_public', false)
          .or('original_creator_id.not.is.null,created_sign.eq.Arrangely');

        setStats({
          public: publicSongs?.length || 0,
          privateOwn: privateOwnSongs?.length || 0,
          privateFromCreators: privateFromCreatorSongs?.length || 0
        });

        // Get chat settings
        const { data: chatSettingsData } = await supabase
          .from('support_chat_settings')
          .select('is_enabled')
          .eq('user_id', user.id)
          .single();

        if (chatSettingsData) {
          setChatSettings(chatSettingsData);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          bio: formData.bio,
          musical_role: formData.musical_role,
          usage_context: formData.usage_context,
          experience_level: formData.experience_level,
          instruments: formData.instruments,
          phone_number: formData.phone_number,
          first_name: formData.first_name,
          last_name: formData.last_name,
          city: formData.city,
          country: formData.country,
          hear_about_us: formData.hear_about_us,
          youtube_channel: formData.youtube_channel
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // 1. List & remove old files in this user's folder
      const { data: files, error: listError } = await supabase.storage
        .from("profile-photos")
        .list(user.id);

      if (listError) {
        console.error("Error listing files:", listError.message);
      } else if (files && files.length > 0) {
        const pathsToRemove = files.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("profile-photos").remove(pathsToRemove);
      }

      // 2. Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);

      if (data?.publicUrl) {
        // 4. Update profile with avatar URL
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: data.publicUrl })
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        setAvatarUrl(data.publicUrl);
        setProfile({ ...profile, avatar_url: data.publicUrl });

        toast({
          title: "Photo Updated",
          description: "Your profile photo has been successfully updated.",
        });
      }
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChatSettingsChange = async (enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('support_chat_settings')
        .upsert({
          user_id: user.id,
          is_enabled: enabled
        });

      if (error) throw error;

      setChatSettings({ is_enabled: enabled });
      toast({
        title: "Chat Settings Updated",
        description: `Support chat has been ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-sanctuary ${isMobileView ? 'pt-32 py-4' : 'pt-32 py-8'}`}>
      <div className={`container mx-auto px-4 ${isMobileView ? 'max-w-full px-2' : 'max-w-4xl'}`}>
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} alt="Profile photo" />
                <AvatarFallback className="text-lg">
                  {formData.display_name ? formData.display_name.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">
                  {formData.display_name || user?.email || 'User'}
                </h1>
                {/* {profile?.creator_type === 'creator_professional' && (
                  <VerifiedBadge size="md" />
                )} */}
                <div className="flex items-center gap-2">
                  {/* {isCreator && (
                    <Badge variant="default" className="flex items-center gap-1 bg-primary">
                      <CheckCircle className="h-3 w-3" />
                      ARRANGER
                    </Badge>
                  )} */}
                  {!subscriptionLoading && (
                    subscriptionStatus?.hasActiveSubscription || subscriptionStatus?.isTrialing ? (
                      <PremiumBadge variant="small" />
                    ) : (
                      <PremiumBadge variant="basic" />
                    )
                  )}
                </div>
              </div>
              <p className="text-muted-foreground">Manage your profile information and account settings</p>
              {formData.bio && (
                <p className="text-sm text-muted-foreground mt-2 italic">"{formData.bio}"</p>
              )}
            </div>
          </div>
        </div>

        <div className={`grid gap-6 ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
          {/* Profile Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Profile Information
              </CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <Label>Display Name</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="How you want to be displayed"
                />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  disabled={!isEditing}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <Label>Musical Role</Label>
                <Input
                  value={formData.musical_role}
                  onChange={(e) => setFormData({ ...formData, musical_role: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label>Usage Context</Label>
                <Input
                  value={formData.usage_context}
                  onChange={(e) => setFormData({ ...formData, usage_context: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label>Experience Level</Label>
                <Input
                  value={formData.experience_level}
                  onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label>Instruments</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.instruments.map((instrument, index) => (
                    <Badge key={index} variant="secondary">
                      {instrument}
                    </Badge>
                  ))}
                  {formData.instruments.length === 0 && (
                    <span className="text-muted-foreground text-sm">No instruments listed</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Your city"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Your country"
                  />
                </div>
              </div>

              <div>
                <Label>How did you hear about us?</Label>
                <Input
                  value={formData.hear_about_us}
                  onChange={(e) => setFormData({ ...formData, hear_about_us: e.target.value })}
                  disabled={!isEditing}
                  placeholder="How you discovered Arrangely"
                />
              </div>

              <div>
                <Label>YouTube Channel</Label>
                <Input
                  value={formData.youtube_channel}
                  onChange={(e) => setFormData({ ...formData, youtube_channel: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://youtube.com/@yourchannel"
                />
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      display_name: profile?.display_name || '',
                      bio: profile?.bio || '',
                      musical_role: profile?.musical_role || '',
                      usage_context: profile?.usage_context || '',
                      experience_level: profile?.experience_level || '',
                      instruments: profile?.instruments || [],
                      phone_number: (profile as any)?.phone_number || '',
                      city: (profile as any)?.city || '',
                      country: (profile as any)?.country || '',
                      hear_about_us: (profile as any)?.hear_about_us || '',
                      youtube_channel: (profile as any)?.youtube_channel || '',
                      first_name: (profile as any)?.first_name || '',
                      last_name: (profile as any)?.last_name || ''
                    });
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics and Security */}
          <div className="space-y-6">
            {/* Arrangement Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Arrangement Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-card rounded-lg border">
                    <div className="text-xl font-bold text-primary">{stats.public}</div>
                    <div className="text-xs text-muted-foreground">Public</div>
                  </div>
                  <div className="text-center p-3 bg-card rounded-lg border">
                    <div className="text-xl font-bold text-accent">{stats.privateOwn}</div>
                    <div className="text-xs text-muted-foreground">Own Creations</div>
                  </div>
                  <div className="text-center p-3 bg-card rounded-lg border">
                    <div className="text-xl font-bold text-secondary">{stats.privateFromCreators}</div>
                    <div className="text-xs text-muted-foreground">From Creators</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    Total: {stats.public + stats.privateOwn + stats.privateFromCreators} arrangements
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Settings */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Support Chat Widget</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable the floating support chat button
                    </p>
                  </div>
                  <Switch
                    checked={chatSettings.is_enabled}
                    onCheckedChange={handleChatSettingsChange}
                  />
                </div>
              </CardContent>
            </Card> */}

            {/* Password Change */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security
                </CardTitle>
                {!isChangingPassword && (
                  <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>
                    Change Password
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!isChangingPassword ? (
                  <p className="text-muted-foreground text-sm">
                    Keep your account secure by regularly updating your password.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Current Password</Label>
                      <Input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Confirm New Password</Label>
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleChangePassword} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Update Password
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground mt-20 mb-20">
              App Version {appVersion} ({buildNumber})
            </div>

            {/* Delete Account */}
            <DeleteAccountSection userEmail={user?.email || ""} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;