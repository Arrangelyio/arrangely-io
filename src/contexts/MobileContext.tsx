// contexts/MobileContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

type MobileContextType = {
  isMobileView: boolean;
  setIsMobileView: (val: boolean) => void;
};

const MobileContext = createContext<MobileContextType>({
  isMobileView: false,
  setIsMobileView: () => {},
});

export const MobileProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const mobileParam = urlParams.get("isMobile");

    if (mobileParam === "true") {
      setIsMobileView(true);
    } else if (mobileParam === "false") {
      setIsMobileView(false);
    }
    // kalau gak ada param, biarkan state sebelumnya (persist antar halaman)
  }, [location.search]);

  return (
    <MobileContext.Provider value={{ isMobileView, setIsMobileView }}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = () => useContext(MobileContext);
