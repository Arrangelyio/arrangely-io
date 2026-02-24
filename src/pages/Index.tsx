import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { EventBannerPopup } from "@/components/EventBannerPopup";
import { Capacitor } from "@capacitor/core";

// New components
import HomePage from "@/components/home/HomePage";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    getCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div
      className={`
        ${Capacitor.isNativePlatform() ? "pt-16" : "pt-14"} 
        min-h-screen
      `}
    >
      {/* Use the same HomePage component for both guests and logged-in users */}
      <HomePage />

      <EventBannerPopup />
    </div>
  );
};

export default Index;
