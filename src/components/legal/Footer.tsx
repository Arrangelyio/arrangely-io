import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

const Footer = () => {
  const { t } = useLanguage();
  const hideIOSPricing = isCapacitorIOS();

  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <img
                  src="/Final-Logo-Arrangely-Logogram.png"
                  alt="Arrangely Logo"
                  className="w-6 h-6"
                />
              </div>
              <span className="text-xl font-bold">Arrangely</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Professional chord sheet and song arrangement platform for musicians and worship teams.
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              PT Nada Karya Digital
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-primary">
                  Features
                </Link>
              </li>
              {!hideIOSPricing && (
                <li>
                  <Link to="/pricing" className="text-muted-foreground hover:text-primary">
                    Pricing
                  </Link>
                </li>
              )}
              <li>
                <Link to="/library" className="text-muted-foreground hover:text-primary">
                  Song Library
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-primary">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/chat" className="text-muted-foreground hover:text-primary">
                  Live Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy/kebijakan-privasi" className="text-muted-foreground hover:text-primary">
                  Kebijakan Privasi (ID)
                </Link>
              </li>
              <li>
                <Link to="/terms/syarat-ketentuan" className="text-muted-foreground hover:text-primary">
                  Syarat & Ketentuan (ID)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PT Nada Karya Digital (Arrangely). All rights reserved.
          </div>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary">
              Terms
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;