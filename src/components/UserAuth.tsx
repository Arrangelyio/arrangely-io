import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoginData, RegisterData } from "@/types/auth";
import { LoginForm } from "./auth/LoginForm";
import { RegisterForm } from "./auth/RegisterForm";
import { validateEmail } from "../../utils/emailValidation";

const UserAuth = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  
  // Login state
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: ""
  });

  // Registration state
  const [registerData, setRegisterData] = useState<RegisterData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    city: "",
    country: "",
    hearAboutUs: "",
    role: "",
    primaryInstrument: [],
    secondaryInstruments: [],
    experience: "",
    bio: "",
    youtubeChannel: "",
    agreeTerms: false
  });

  const handleLogin = (captchaToken: string) => {
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the Cloudflare Turnstile verification",
        variant: "destructive"
      });
      return;
    }

    // TODO: Verify captcha token on server before authentication
    

    toast({
      title: "Login Successful",
      description: "Welcome back!",
    });
  };

  const handleRegister = (captchaToken: string) => {
    // Validate email first
    const emailValidation = validateEmail(registerData.email);
    if (!emailValidation.isValid) {
      toast({
        title: "Invalid Email",
        description: emailValidation.error,
        variant: "destructive"
      });
      return;
    }

    if (!registerData.firstName || !registerData.lastName || !registerData.email || 
        !registerData.password || !registerData.phoneNumber || !registerData.city || 
        !registerData.country || !registerData.role || !registerData.hearAboutUs || !registerData.agreeTerms) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and accept terms",
        variant: "destructive"
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Password Mismatch", 
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (!captchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the Cloudflare Turnstile verification",
        variant: "destructive"
      });
      return;
    }

    // TODO: Verify captcha token on server before registration
    

    toast({
      title: "Registration Successful",
      description: "Welcome to the community!",
    });
  };

  const toggleInstrument = (instrumentId: string, type: 'primary' | 'secondary') => {
    const field = type === 'primary' ? 'primaryInstrument' : 'secondaryInstruments';
    const current = registerData[field];
    
    if (type === 'primary') {
      setRegisterData({
        ...registerData,
        [field]: current.includes(instrumentId) 
          ? current.filter(id => id !== instrumentId)
          : [...current, instrumentId]
      });
    } else {
      setRegisterData({
        ...registerData,
        [field]: current.includes(instrumentId) 
          ? current.filter(id => id !== instrumentId)
          : [...current, instrumentId]
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Hide Back to Home link in mobile view */}
        {/* {!new URLSearchParams(window.location.search).get('isMobile') && (
          <Link to="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        )} */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Join Our Community</h1>
          <p className="text-muted-foreground">Connect with Arrangely and musicians worldwide</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="space-y-6 mt-6">
                <LoginForm 
                  loginData={loginData}
                  setLoginData={setLoginData}
                  onLogin={handleLogin}
                />
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register" className="space-y-6 mt-6">
                <RegisterForm
                  registerData={registerData}
                  setRegisterData={setRegisterData}
                  onRegister={handleRegister}
                  toggleInstrument={toggleInstrument}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserAuth;