export async function verifyTurnstileToken(req, token, remoteIp) {
  // Deteksi domain asal (frontend)
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  let environment = "local";
  if (origin.includes("staging.")) {
    environment = "staging";
  } else if (origin.includes("arrangely.io")) {
    environment = "production";
  }
  
  // Pilih secret key sesuai environment
  let secretKey = "";
  switch(environment){
    case "production":
      secretKey = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY_PRODUCTION") || "";
      break;
    case "staging":
      secretKey = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY_STAGING") || "";
      break;
    default:
      secretKey = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY") || "";
      break;
  }
  if (!secretKey) {
    console.error("❌ Missing Turnstile secret key for environment:", environment);
    return {
      success: false,
      error: `Missing secret key for ${environment}`
    };
  }
  if (!token) {
    return {
      success: false,
      error: "Turnstile token is required"
    };
  }
  // Kirim ke API Cloudflare
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!data.success) {
      console.error("⚠️ Turnstile verification failed:", data["error-codes"]);
      return {
        success: false,
        error: "Captcha verification failed. Please try again."
      };
    }
    
    return {
      success: true
    };
  } catch (err) {
    console.error("🚨 Error verifying Turnstile token:", err);
    return {
      success: false,
      error: "Failed to verify captcha. Please try again later."
    };
  }
}
