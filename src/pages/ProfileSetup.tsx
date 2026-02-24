import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music, User } from "lucide-react";
import { getIntendedUrl, clearIntendedUrl } from "@/utils/redirectUtils";
import {
  countriesWithCities,
  countries,
  countryCodes,
} from "@/constants/locations";

interface ProfileData {
  displayName: string;
  phoneNumber: string;
  country: string;
  city: string;
  musicalRole: string;
  usageContext: string;
  experienceLevel: string;
  instruments: string[];
  bio: string;
}

const ProfileSetup = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isEventRegistration, setIsEventRegistration] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: "",
    phoneNumber: "",
    country: "Indonesia",
    city: "",
    musicalRole: "",
    usageContext: "",
    experienceLevel: "",
    instruments: [],
    bio: "",
  });
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+62");

  const navigate = useNavigate();
  const { toast } = useToast();

  const instrumentOptions = [
    { value: "piano", label: "Piano/Keyboard" },
    { value: "guitar", label: "Guitar" },
    { value: "bass", label: "Bass Guitar" },
    { value: "drums", label: "Drums" },
    { value: "vocals", label: "Vocals" },
    { value: "violin", label: "Violin" },
    { value: "cello", label: "Cello" },
    { value: "saxophone", label: "Saxophone" },
    { value: "trumpet", label: "Trumpet" },
    { value: "flute", label: "Flute" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    const checkUserAndSetDefaults = async () => {
      const pendingEvent = localStorage.getItem("pendingEventRegistration");
      if (pendingEvent) {
        setIsEventRegistration(true);
        // toast({
        //   title: "Satu langkah lagi!",
        //   description: "Lengkapi info profil untuk melanjutkan ke event.",
        // });
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (existingProfile?.is_onboarded) {
        const intendedUrl = getIntendedUrl();
        clearIntendedUrl();
        localStorage.removeItem("pendingEventRegistration");
        
        window.location.href = intendedUrl || "/";
        return;
      }

      if (existingProfile) {
        setProfileData({
          displayName:
            existingProfile.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "",
          phoneNumber:
            existingProfile.phone_number?.replace(/^\+\d+/, "") || "",
          country: existingProfile.country || "Indonesia",
          city: existingProfile.city || "",
          musicalRole: existingProfile.musical_role || "",
          usageContext: existingProfile.usage_context || "",
          experienceLevel: existingProfile.experience_level || "",
          instruments: existingProfile.instruments || [],
          bio: existingProfile.bio || "",
        });

        const currentCountry = existingProfile.country || "Indonesia";
        setAvailableCities(countriesWithCities[currentCountry] || []);
        const countryCodeMatch = countryCodes.find(
          (c) => c.country === currentCountry
        );
        if (countryCodeMatch) setSelectedCountryCode(countryCodeMatch.value);
      } else {
        setProfileData((prev) => ({
          ...prev,
          displayName:
            user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          country: "Indonesia",
        }));
        setAvailableCities(countriesWithCities["Indonesia"] || []);
        setSelectedCountryCode("+62");
      }
    };

    checkUserAndSetDefaults();
    setIsLoading(false);
  }, [navigate]);

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Hapus karakter spesial selain huruf, angka, spasi
      .replace(/[\s_-]+/g, "_") // Ganti spasi menjadi underscore
      .replace(/^-+|-+$/g, ""); // Hapus underscore sisa di awal/akhir
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // [FIX] Cek manual apakah profil sudah ada (Code lama Anda)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id, creator_slug") // Tambahkan select creator_slug
        .eq("user_id", user.id)
        .maybeSingle();

      // [LOGIC BARU] Generate slug hanya jika belum ada di database
      let finalSlug = existingProfile?.creator_slug;

      if (!finalSlug) {
        // Generate slug dasar dari display name
        const baseSlug = createSlug(profileData.displayName);

        finalSlug = createSlug(profileData.displayName);

        // Jika Anda yakin nama pasti unik, cukup pakai:
        // finalSlug = baseSlug;
      }

      const profileToSave = {
        display_name: profileData.displayName,
        phone_number: selectedCountryCode + profileData.phoneNumber,
        country: profileData.country,
        city: profileData.city,
        musical_role: profileData.musicalRole,
        usage_context: profileData.usageContext,
        experience_level: profileData.experienceLevel,
        instruments: profileData.instruments,
        bio: profileData.bio,
        is_onboarded: true,
        creator_slug: finalSlug, // <--- Masukkan field slug di sini
      };

      let error;

      if (existingProfile) {
        // Jika profil SUDAH ADA, lakukan UPDATE
        ({ error } = await supabase
          .from("profiles")
          .update(profileToSave)
          .eq("user_id", user.id));
      } else {
        // Jika profil BELUM ADA, lakukan INSERT
        ({ error } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, ...profileToSave }));
      }

      if (error) throw error;

      toast({
        title: "Profile Saved! 🎉",
        description: "Welcome to Arrangely! You're all set up.",
      });

      const intendedUrl = getIntendedUrl();
      window.location.href = intendedUrl || "/";
    } catch (error: any) {
      console.error("Profile creation error:", error);
      toast({
        title: "Profile Creation Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleInstrumentChange = (instrument: string, checked: boolean) => {
    setProfileData((prev) => ({
      ...prev,
      instruments: checked
        ? [...prev.instruments, instrument]
        : prev.instruments.filter((i) => i !== instrument),
    }));
  };

  const handleCountryChange = (countryName: string) => {
    setProfileData((prev) => ({ ...prev, country: countryName, city: "" }));
    setAvailableCities(countriesWithCities[countryName] || []);
    const countryCodeMatch = countryCodes.find(
      (c) => c.country === countryName
    );
    if (countryCodeMatch) setSelectedCountryCode(countryCodeMatch.value);
  };

  return (
    // [FIX 1] Menambahkan padding atas (pt-28) dan padding horizontal (px-4)
    <div className="min-h-screen bg-gradient-sanctuary w-full pt-28 pb-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        {" "}
        {/* [FIX 2] Mengurangi lebar maksimal ke max-w-2xl */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Music className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Arrangely</h1>
          </div>
          <p className="text-muted-foreground">
            Let's set up your musical profile
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Complete Your Profile
            </CardTitle>
            <CardDescription>
              Tell us about yourself to get the best experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* --- LAYOUT GRID YANG DISEMPURNAKAN --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="display-name">Display Name *</Label>
                  <Input
                    id="display-name"
                    type="text"
                    placeholder="How should we call you?"
                    value={profileData.displayName}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number *</Label>
                  <div className="flex">
                    <Select
                      value={selectedCountryCode}
                      onValueChange={setSelectedCountryCode}
                    >
                      <SelectTrigger className="w-[120px] rounded-r-none border-r-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {countryCodes.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone-number"
                      type="tel"
                      placeholder="812..."
                      value={profileData.phoneNumber}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          phoneNumber: e.target.value.replace(/\D/g, ""),
                        }))
                      }
                      className="rounded-l-none"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select
                    value={profileData.country}
                    onValueChange={handleCountryChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>City *</Label>
                  <Select
                    value={profileData.city}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        city: value,
                      }))
                    }
                    required={!isEventRegistration}
                    disabled={
                      !profileData.country || availableCities.length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !profileData.country
                            ? "Select country first"
                            : "Select your city"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Primary Musical Role </Label>
                  <Select
                    value={profileData.musicalRole}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        musicalRole: value,
                      }))
                    }
                    required={!isEventRegistration}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyboardist">
                        Keyboardist/Pianist
                      </SelectItem>
                      <SelectItem value="guitarist">Guitarist</SelectItem>
                      <SelectItem value="bassist">Bass Player</SelectItem>
                      <SelectItem value="drummer">Drummer</SelectItem>
                      <SelectItem value="vocalist">Vocalist/Singer</SelectItem>
                      <SelectItem value="worship_leader">
                        Worship Leader
                      </SelectItem>
                      <SelectItem value="music_director">
                        Music Director
                      </SelectItem>
                      <SelectItem value="sound_engineer">
                        Sound Engineer
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Where will you use Arrangely? </Label>
                  <Select
                    value={profileData.usageContext}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        usageContext: value,
                      }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select usage context" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="church">
                        Church/Worship Service
                      </SelectItem>
                      <SelectItem value="event">Events/Weddings</SelectItem>
                      <SelectItem value="cafe">Cafe/Restaurant</SelectItem>
                      <SelectItem value="concert">
                        Concerts/Performances
                      </SelectItem>
                      <SelectItem value="studio">Recording Studio</SelectItem>
                      <SelectItem value="personal">
                        Personal Practice
                      </SelectItem>
                      <SelectItem value="education">
                        Education/Teaching
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Experience Level </Label>
                  <Select
                    value={profileData.experienceLevel}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        experienceLevel: value,
                      }))
                    }
                    required={!isEventRegistration}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">
                        Beginner (0-2 years)
                      </SelectItem>
                      <SelectItem value="intermediate">
                        Intermediate (2-5 years)
                      </SelectItem>
                      <SelectItem value="advanced">
                        Advanced (5+ years)
                      </SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="bio">Bio/About Yourself (optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about your musical background or experience..."
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    className="min-h-[100px]"
                    disabled={isLoading}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Instruments you play (optional)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-48 overflow-y-auto p-4 border rounded-md">
                    {instrumentOptions.map((instrument) => (
                      <div
                        key={instrument.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={instrument.value}
                          checked={profileData.instruments.includes(
                            instrument.value
                          )}
                          onCheckedChange={(checked) =>
                            handleInstrumentChange(instrument.value, !!checked)
                          }
                        />
                        <Label
                          htmlFor={instrument.value}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {instrument.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-worship hover:opacity-90"
                disabled={
                  isLoading ||
                  !profileData.displayName ||
                  !profileData.phoneNumber ||
                  !profileData.country ||
                  (!isEventRegistration &&
                    (!profileData.city ||
                      !profileData.musicalRole ||
                      !profileData.experienceLevel))
                }
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
