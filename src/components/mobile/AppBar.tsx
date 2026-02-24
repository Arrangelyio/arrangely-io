import { Link, useLocation } from "react-router-dom";
import { useCapacitor } from "@/hooks/useCapacitor";
import UserMenu from "../UserMenu";
import { checkIsMobileView, getMobileUrl } from "@/utils/mobileUtils";
import { useEffect, useState } from "react";

const AppBar = () => {
  const { isNative } = useCapacitor();
  const location = useLocation();
  const [isMobileView, setIsMobileView] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const isMobile = isNative || checkIsMobileView(urlParams);
    setIsMobileView(isMobile);
  }, [location.search, isNative]);
  
  if (!isMobileView) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border safe-area-inset-top">
      <div className="flex items-center justify-between h-14 px-4 pt-safe">
        <Link to={getMobileUrl('/')} className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <img
                src="/Final-Logo-Arrangely-Logogram.png"
                alt="Logo Arrangely"
                className="w-6 h-6"
              />
            </div>
            <span className="font-bold text-lg text-primary">
              Arrangely
            </span>
          </div>
        </Link>
        
        <div className="flex items-center">
          <UserMenu />
        </div>
      </div>
    </div>
  );
};

export default AppBar;