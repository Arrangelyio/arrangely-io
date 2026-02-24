import { Turnstile } from "@marsidev/react-turnstile";
import { useRef, forwardRef, useImperativeHandle } from "react";

interface CaptchaProps {
  onChange?: (token: string | null) => void;
  onExpired?: () => void;
}

export interface CaptchaRef {
  reset: () => void;
  execute: () => void;
}

export const Captcha = forwardRef<CaptchaRef, CaptchaProps>(
  ({ onChange, onExpired }, ref) => {
    const turnstileRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
      },
      execute: () => {
        // Turnstile auto-runs, so execute is not needed
      },
    }));

    // 🌍 Detect current environment
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";

    const isProduction =
      hostname === "arrangely.io" || hostname === "www.arrangely.io";
    const isStaging = hostname === "staging.arrangely.io";
    const isLocal =
      hostname === "localhost" || hostname === "127.0.0.1";

    // 🔑 Choose site key based on environment
    const siteKey = isProduction
      ? "0x4AAAAAAB_PljwJbm3rUzz7" // replace with your production key
      : isStaging
      ? "0x4AAAAAAB_PNokz-Jy-E9vZ" // replace with your staging key
      : "0x4AAAAAAB_PgkoivEqJFAmV"; // Cloudflare test key for localhost

    return (
      <div className="flex flex-col items-center gap-2">
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={onChange}
          onExpire={onExpired}
          onError={() => {
            console.error(
              "❌ Cloudflare Turnstile error — check your site key or domain whitelist"
            );
            onChange?.(null);
          }}
          options={{
            theme: "light", // or "dark"
            retry: "auto",
          }}
        />
      </div>
    );
  }
);

Captcha.displayName = "Captcha";
