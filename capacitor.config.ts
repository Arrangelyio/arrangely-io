import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "arrangely.app",
  appName: "Arrangely",
  webDir: "dist",

  server: {
    url: 'https://arrangely.io/',
    // url: 'http://192.168.18.5:8080/',
    cleartext: true
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
