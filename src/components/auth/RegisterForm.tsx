import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus } from "lucide-react";
import { RegisterData } from "@/types/auth";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { ProfessionalInfoForm } from "./ProfessionalInfoForm";
import { MusicalInfoForm } from "./MusicalInfoForm";
import { Captcha, CaptchaRef } from "@/components/ui/captcha";
import { useRef, useState } from "react";

interface RegisterFormProps {
  registerData: RegisterData;
  setRegisterData: (data: RegisterData) => void;
  onRegister: (captchaToken: string) => void;
  toggleInstrument: (instrumentId: string, type: 'primary' | 'secondary') => void;
}

export const RegisterForm = ({ registerData, setRegisterData, onRegister, toggleInstrument }: RegisterFormProps) => {
  const captchaRef = useRef<CaptchaRef>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const handleRegister = () => {
    if (!captchaToken) {
      alert("Please complete the Cloudflare Turnstile verification");
      return;
    }
    onRegister(captchaToken);
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpired = () => {
    setCaptchaToken(null);
  };

  return (
    <div className="space-y-6">
      <PersonalInfoForm registerData={registerData} setRegisterData={setRegisterData} />
      
      <ProfessionalInfoForm registerData={registerData} setRegisterData={setRegisterData} />
      
      <MusicalInfoForm 
        registerData={registerData} 
        setRegisterData={setRegisterData}
        toggleInstrument={toggleInstrument}
      />

      {/* Terms and Submit */}
      <div className="space-y-4">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={registerData.agreeTerms}
            onCheckedChange={(checked) => setRegisterData({...registerData, agreeTerms: !!checked})}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the{" "}
              <a 
                href="/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Terms of Service
              </a>
              {" "}and{" "}
              <a 
                href="/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a> *
            </label>
            <p className="text-xs text-muted-foreground">
              By registering, you agree to our terms of service and privacy policy, including the use of your data for platform features and community collaboration.
            </p>
          </div>
        </div>

        <div>
          <Captcha
            ref={captchaRef}
            onChange={handleCaptchaChange}
            onExpired={handleCaptchaExpired}
          />
        </div>

        <Button onClick={handleRegister} className="w-full" size="lg" disabled={!captchaToken || !registerData.agreeTerms}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Account
        </Button>
      </div>
    </div>
  );
};