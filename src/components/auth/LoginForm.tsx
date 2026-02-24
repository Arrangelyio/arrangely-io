import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { LoginData } from "@/types/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Captcha, CaptchaRef } from "@/components/ui/captcha";
import { useRef, useState } from "react";

interface LoginFormProps {
  loginData: LoginData;
  setLoginData: (data: LoginData) => void;
  onLogin: (captchaToken: string) => void;
}

export const LoginForm = ({ loginData, setLoginData, onLogin }: LoginFormProps) => {
  const { t } = useLanguage();
  const captchaRef = useRef<CaptchaRef>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const handleLogin = () => {
    if (!captchaToken) {
      alert("Please complete the Cloudflare Turnstile verification");
      return;
    }
    onLogin(captchaToken);
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpired = () => {
    setCaptchaToken(null);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="login-email">{t("auth.email")}</Label>
        <Input
          id="login-email"
          type="email"
          value={loginData.email}
          onChange={(e) => setLoginData({...loginData, email: e.target.value})}
          placeholder={t("auth.emailPlaceholder")}
        />
      </div>
      
      <div>
        <Label htmlFor="login-password">{t("auth.password")}</Label>
        <Input
          id="login-password"
          type="password"
          value={loginData.password}
          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
          placeholder={t("auth.passwordPlaceholder")}
        />
      </div>

      <div>
        <Captcha
          ref={captchaRef}
          onChange={handleCaptchaChange}
          onExpired={handleCaptchaExpired}
        />
      </div>

      <Button onClick={handleLogin} className="w-full" disabled={!captchaToken}>
        <LogIn className="h-4 w-4 mr-2" />
        {t("auth.signIn")}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        <Button variant="link" className="p-0 h-auto">
          {t("auth.forgotPassword")}
        </Button>
      </div>
    </div>
  );
};