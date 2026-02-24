import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";
import IOSPricingInfo from "@/pages/ios/IOSPricingInfo";

interface IOSPricingGuardProps {
  children: React.ReactNode;
}

/**
 * On iOS:
 * - Show read-only pricing info (Spotify-style)
 * - No purchase, no CTA, no prices interaction
 *
 * On non-iOS:
 * - Render full Pricing page
 */
const IOSPricingGuard = ({ children }: IOSPricingGuardProps) => {
  if (isCapacitorIOS()) {
    return <IOSPricingInfo />;
  }

  return <>{children}</>;
};

export default IOSPricingGuard;
