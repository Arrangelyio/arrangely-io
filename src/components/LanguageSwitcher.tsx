import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "id" : "en";

    // Handle privacy policy and terms pages routing
    if (location.pathname === "/privacy" && newLanguage === "id") {
      navigate("/privacy/kebijakan-privasi");
    } else if (
      location.pathname === "/privacy/kebijakan-privasi" &&
      newLanguage === "en"
    ) {
      navigate("/privacy");
    } else if (location.pathname === "/terms" && newLanguage === "id") {
      navigate("/terms/ketentuan-layanan");
    } else if (
      location.pathname === "/terms/ketentuan-layanan" &&
      newLanguage === "en"
    ) {
      navigate("/terms");
    } else {
      // For other pages, just change the language context
      setLanguage(newLanguage);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium">
        {language === "en" ? "ID" : "EN"}
      </span>
    </Button>
  );
};

export default LanguageSwitcher;
