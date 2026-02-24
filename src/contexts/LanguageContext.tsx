import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "@/constants/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage for saved language preference
    const saved = localStorage.getItem("arrangelyLanguage");
    return (saved as Language) || "en";
  });

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem("arrangelyLanguage", language);
  }, [language]);

  const t = (path: string): string => {
    const keys = path.split(".");
    let value: any = translations[language];
    
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        // Fallback to English if translation not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === "object" && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return path; // Return the path if translation not found
          }
        }
        break;
      }
    }
    
    return typeof value === "string" ? value : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};