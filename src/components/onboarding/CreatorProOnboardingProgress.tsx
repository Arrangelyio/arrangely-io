import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronUp, Crown, Music, User } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

type StepKey = "profile" | "arrangement" | "publication";
type StepState = Record<StepKey, boolean>;

const STORAGE_KEY = "creatorProOnboarding.collapsed";

function safeBool(v: unknown) {
  return Boolean(v);
}

export default function CreatorProOnboardingProgress() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return safeBool(JSON.parse(localStorage.getItem(STORAGE_KEY) || "false"));
    } catch {
      return false;
    }
  });
  const [steps, setSteps] = useState<StepState>({
    profile: false,
    arrangement: false,
    publication: false,
  });

  const completedCount = useMemo(
    () => Object.values(steps).filter(Boolean).length,
    [steps],
  );
  const totalCount = 3;
  const progress = useMemo(
    () => Math.round((completedCount / totalCount) * 100),
    [completedCount],
  );

  const shouldHideOnRoute = useMemo(() => {
    // Avoid clutter on auth/payment flows and the onboarding page itself.
    const p = location.pathname;
    return (
      p.startsWith("/auth") ||
      p.startsWith("/auth-callback") ||
      p.startsWith("/pricing") ||
      p.startsWith("/payment") ||
      p.startsWith("/creator-pro-welcome")
    );
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    let isMounted = true;

    const refresh = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!isMounted) return;
          setIsVisible(false);
          setIsLoading(false);
          return;
        }

        // Only show for Creator Community creators (profiles.creator_type).
        const { data: profile } = await supabase
          .from("profiles")
          .select("creator_type, display_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        const isCreatorPro = profile?.creator_type === "creator_pro";
        if (!isCreatorPro) {
          if (!isMounted) return;
          setIsVisible(false);
          setIsLoading(false);
          return;
        }

        // Step 1: basic profile completion heuristic.
        const isProfileComplete =
          Boolean(profile?.display_name) && Boolean(profile?.avatar_url);

        // Step 2: first arrangement created.
        const { count: arrangementCount } = await supabase
          .from("chord_grids")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Step 3: first publication attempt (Creator Community publications).
        const { count: publicationCount } = await supabase
          .from("creator_pro_publications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        const next: StepState = {
          profile: isProfileComplete,
          arrangement: (arrangementCount || 0) > 0,
          publication: (publicationCount || 0) > 0,
        };

        if (!isMounted) return;
        setSteps(next);
        setIsVisible(Object.values(next).some((v) => !v));
      } catch {
        if (!isMounted) return;
        // If something fails, don’t block the user from resuming onboarding.
        setIsVisible(true);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 12000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [location.pathname]);

  const nextAction = useMemo(() => {
    if (!steps.profile)
      return {
        label: "Complete profile",
        onClick: () => navigate("/profile"),
        icon: User,
      };
    if (!steps.arrangement)
      return {
        label: "Create arrangement",
        onClick: () => navigate("/library"),
        icon: Music,
      };
    if (!steps.publication)
      return {
        label: "Publish to library",
        onClick: () => navigate("/community-library"),
        icon: Crown,
      };
    return {
      label: "Resume onboarding",
      onClick: () => navigate("/creator-pro-welcome"),
      icon: Crown,
    };
  }, [navigate, steps]);

  if (shouldHideOnRoute) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className={
            "fixed left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-[60] bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6 pointer-events-auto"
          }
        >
          <Card className="border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
            <CardContent className="p-3">
              <Collapsible
                open={!collapsed}
                onOpenChange={(open) => setCollapsed(!open)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className="px-2 py-0.5 text-xs">Creator Community</Badge>
                      <span className="text-sm font-semibold truncate">
                        Onboarding
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {completedCount}/{totalCount} steps completed
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/creator-pro-welcome")}
                    >
                      Resume
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Toggle details"
                      >
                        <ChevronUp
                          className={`h-4 w-4 transition-transform ${
                            collapsed ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={isLoading ? 20 : progress} className="h-2" />
                </div>

                <CollapsibleContent className="pt-3">
                  <div className="space-y-2">
                    <StepRow
                      done={steps.profile}
                      icon={User}
                      title="Complete your profile"
                      actionLabel="Edit"
                      onAction={() => navigate("/profile")}
                    />
                    <StepRow
                      done={steps.arrangement}
                      icon={Music}
                      title="Create first arrangement"
                      actionLabel="Go"
                      onAction={() => navigate("/library")}
                    />
                    <StepRow
                      done={steps.publication}
                      icon={Crown}
                      title="Publish to Community Library"
                      actionLabel="Open"
                      onAction={() => navigate("/community-library")}
                    />
                  </div>

                  <div className="mt-3">
                    <Button className="w-full" onClick={nextAction.onClick}>
                      <nextAction.icon className="h-4 w-4 mr-2" />
                      {nextAction.label}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepRow({
  done,
  icon: Icon,
  title,
  actionLabel,
  onAction,
}: {
  done: boolean;
  icon: any;
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0">
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Icon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="text-sm truncate">
          <span className={done ? "text-muted-foreground line-through" : ""}>
            {title}
          </span>
        </div>
      </div>

      {!done && (
        <Button size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
