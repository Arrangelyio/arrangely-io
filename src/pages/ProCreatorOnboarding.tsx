import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  Check, 
  Star, 
  TrendingUp, 
  Video, 
  Volume2, 
  Package,
  BarChart3,
  Users,
  DollarSign,
  Award,
  Sparkles
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

const ProCreatorOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    experience: "",
    specialties: [] as string[],
    portfolio: "",
    socialMedia: {
      website: "",
      instagram: "",
      youtube: "",
      spotify: ""
    },
    motivation: "",
    agreeToTerms: false,
    agreeToQuality: false
  });

  const totalSteps = 4;

  const proFeatures = [
    {
      icon: Crown,
      title: "Verified Creator Badge",
      description: "Stand out with a verified pro creator badge on your profile"
    },
    {
      icon: Video,
      title: "Video Tutorial Uploads",
      description: "Create and sell video tutorials for your arrangements"
    },
    {
      icon: Volume2,
      title: "Sequencer Pack Sales",
      description: "Upload and sell backing tracks, stems, and MIDI files"
    },
    {
      icon: Package,
      title: "Bundle Creation",
      description: "Create and sell bundles of multiple arrangements"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Detailed insights into your sales and audience"
    },
    {
      icon: TrendingUp,
      title: "Priority Visibility",
      description: "Higher placement in search results and featured sections"
    },
    {
      icon: DollarSign,
      title: "Better Revenue Share",
      description: "Keep 80% of your earnings (vs 70% for free creators)"
    },
    {
      icon: Award,
      title: "Exclusive Opportunities",
      description: "Access to exclusive collaborations and partnerships"
    }
  ];

  const specialtyOptions = [
    "Piano/Keyboard", "Guitar", "Vocals/Choir", "Bass", "Drums", 
    "Strings", "Worship Leading", "Music Direction", "Songwriting",
    "Audio Production", "MIDI Programming", "Live Sound"
  ];

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Pro Creator</h2>
              <p className="text-muted-foreground">
                Take your music ministry to the next level with advanced creator tools
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proFeatures.map((feature, index) => (
                <Card key={index} className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
              <p className="text-muted-foreground">
                Tell us about yourself and your musical background
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Full Name</label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Phone Number</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, State/Country"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Bio</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about your musical journey, ministry experience, and passion for worship music..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Years of Experience</label>
              <Input
                value={formData.experience}
                onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                placeholder="e.g., 5+ years in worship ministry"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Musical Expertise</h2>
              <p className="text-muted-foreground">
                Select your areas of expertise and share your portfolio
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-3 block">Specialties (Select all that apply)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {specialtyOptions.map((specialty) => (
                  <div key={specialty} className="flex items-center space-x-2">
                    <Checkbox
                      id={specialty}
                      checked={formData.specialties.includes(specialty)}
                      onCheckedChange={() => handleSpecialtyToggle(specialty)}
                    />
                    <label
                      htmlFor={specialty}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {specialty}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Portfolio/Sample Work</label>
              <Input
                value={formData.portfolio}
                onChange={(e) => setFormData(prev => ({ ...prev, portfolio: e.target.value }))}
                placeholder="Share a link to your music, YouTube channel, or portfolio"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Social Media & Online Presence</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Website</label>
                  <Input
                    value={formData.socialMedia.website}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, website: e.target.value }
                    }))}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Instagram</label>
                  <Input
                    value={formData.socialMedia.instagram}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                    }))}
                    placeholder="@yourusername"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">YouTube</label>
                  <Input
                    value={formData.socialMedia.youtube}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, youtube: e.target.value }
                    }))}
                    placeholder="Your YouTube channel"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Spotify</label>
                  <Input
                    value={formData.socialMedia.spotify}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      socialMedia: { ...prev.socialMedia, spotify: e.target.value }
                    }))}
                    placeholder="Your Spotify artist profile"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Final Steps</h2>
              <p className="text-muted-foreground">
                Complete your application to become a Pro Creator
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Why do you want to become a Creator Community member?
              </label>
              <Textarea
                value={formData.motivation}
                onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                placeholder="Share your motivation for joining the Creator Community program and how you plan to contribute to the community..."
                rows={4}
              />
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Creator Community Benefits Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Verified creator badge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Upload video tutorials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Sell sequencer packs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Create bundles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Priority visibility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>80% revenue share</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Exclusive opportunities</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, agreeToTerms: checked as boolean }))
                  }
                />
                <label htmlFor="terms" className="text-sm leading-6">
                  I agree to the Pro Creator <a href="#" className="text-primary hover:underline">Terms of Service</a> and understand the platform's revenue sharing model (80% creator, 20% platform).
                </label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="quality"
                  checked={formData.agreeToQuality}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, agreeToQuality: checked as boolean }))
                  }
                />
                <label htmlFor="quality" className="text-sm leading-6">
                  I commit to maintaining high-quality content standards and providing excellent customer support for my arrangements and tutorials.
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">Pro Creator Application</h1>
              <Badge className="bg-yellow-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Pro Tier
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </div>
          </div>

          {/* Step Content */}
          <Card className="mb-8">
            <CardContent className="p-8">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            {currentStep === totalSteps ? (
              <Button 
                className="bg-gradient-worship hover:opacity-90"
                disabled={!formData.agreeToTerms || !formData.agreeToQuality}
              >
                <Crown className="h-4 w-4 mr-2" />
                Submit Application
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                className="bg-gradient-worship hover:opacity-90"
              >
                Next Step
              </Button>
            )}
          </div>

          {/* Help Section */}
          <Card className="mt-8 border-muted">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Users className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Our team reviews applications within 3-5 business days. If you have questions about the Creator Community program, feel free to reach out.
                  </p>
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProCreatorOnboarding;