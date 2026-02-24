import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  Check, 
  Star, 
  Sparkles,
  Music,
  User,
  ArrowRight,
  Library,
  TrendingUp,
  Gift,
  ChevronRight,
  PartyPopper
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useCreatorProFeatures } from "@/hooks/useCreatorProFeatures";

const CreatorProWelcome = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [userName, setUserName] = useState("");
  const { earnPerLibraryAdd } = useCreatorProFeatures();

  const totalSteps = 4;

  useEffect(() => {
    // Get user name
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, first_name")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          setUserName(profile.display_name || profile.first_name || "Creator");
        }
      }
    };
    fetchUser();

    // Auto-advance animation
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const benefits = [
    {
      icon: Library,
      title: "Publish to Community Library",
      description: "Share your arrangements with thousands of musicians"
    },
    {
      icon: User,
      title: "Own Profile Page",
      description: "Build your creator brand with a personalized profile"
    },
    {
      icon: Gift,
      title: `Earn Rp${(earnPerLibraryAdd ?? 250).toLocaleString("id-ID")}/Library Add`,
      description: "Get rewarded when others add your songs to their library"
    },
    {
      icon: TrendingUp,
      title: "Track Your Performance",
      description: "Access analytics to see how your arrangements perform"
    }
  ];

  const nextSteps = [
    {
      step: 1,
      title: "Complete Your Profile",
      description: "Add your bio, profile picture, and social links",
      action: "Go to Profile",
      path: "/profile",
      icon: User
    },
    {
      step: 2,
      title: "Create Your First Arrangement",
      description: "Import a song and create your first chord arrangement",
      action: "Create Arrangement",
      path: "/library",
      icon: Music
    },
    {
      step: 3,
      title: "Publish to Community Library",
      description: "Share your arrangement with the community",
      action: "View Community Library",
      path: "/marketplace",
      icon: Library
    }
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30"
              >
                <Crown className="h-12 w-12 text-white" />
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -top-2 -right-2"
              >
                <PartyPopper className="h-8 w-8 text-amber-500" />
              </motion.div>
            </div>

            <div className="space-y-3">
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent"
              >
                Welcome to Creator Community! 🎉
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-muted-foreground max-w-md mx-auto"
              >
                Congratulations, <span className="font-semibold text-foreground">{userName}</span>! 
                You're now a Creator Community member.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 text-sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Creator Community Active
              </Badge>
            </motion.div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Your Creator Community Benefits</h2>
              <p className="text-muted-foreground">
                Here's what you can do as a Creator Community member
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-amber-200/50 hover:border-amber-400/50 transition-colors h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3 rounded-xl">
                          <benefit.icon className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">What's Next?</h2>
              <p className="text-muted-foreground">
                Follow these steps to get started
              </p>
            </div>

            <div className="space-y-4 max-w-lg mx-auto">
              {nextSteps.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card 
                    className="border-amber-200/50 hover:border-amber-400/50 transition-all hover:shadow-md cursor-pointer group"
                    onClick={() => navigate(item.path)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-0.5 group-hover:text-amber-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
              <Check className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold">You're All Set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your Creator Community account is ready. Start creating and sharing your arrangements with the community.
              </p>
            </div>

            <Card className="max-w-md mx-auto border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Quick Actions</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <Star className="h-3 w-3 mr-1" />
                    Pro Member
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-1 hover:border-amber-400"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="h-5 w-5 text-amber-600" />
                    <span className="text-xs">Edit Profile</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-1 hover:border-amber-400"
                    onClick={() => navigate("/library")}
                  >
                    <Music className="h-5 w-5 text-amber-600" />
                    <span className="text-xs">My Library</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-1 hover:border-amber-400"
                    onClick={() => navigate("/marketplace")}
                  >
                    <Library className="h-5 w-5 text-amber-600" />
                    <span className="text-xs">Community</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 flex flex-col gap-1 hover:border-amber-400"
                    onClick={() => navigate("/creator-dashboard")}
                  >
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                    <span className="text-xs">Dashboard</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button 
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
              onClick={() => navigate("/library")}
            >
              Start Creating
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Getting Started</span>
                <span className="font-medium">{currentStep + 1} of {totalSteps}</span>
              </div>
              <Progress value={((currentStep + 1) / totalSteps) * 100} className="h-2" />
            </div>
          </div>

          {/* Step Content */}
          <Card className="mb-8 border-amber-200/30 shadow-lg">
            <CardContent className="p-8 md:p-12">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="gap-2"
            >
              Previous
            </Button>
            
            {currentStep === totalSteps - 1 ? (
              <Button 
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2"
                onClick={() => navigate("/library")}
              >
                <Sparkles className="h-4 w-4" />
                Start Creating
              </Button>
            ) : (
              <Button 
                onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorProWelcome;
