import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScheduleDemoModal from "@/components/ScheduleDemoModal";
import { useLanguage } from "@/contexts/LanguageContext";

const CTA = () => {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const { t } = useLanguage();
  return (
    <section className="relative py-20 px-4 bg-gradient-worship text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30"></div>
      <div className="relative container mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("cta.title")}
            <span className="block">{t("cta.subtitle")}</span>
          </h2>

          <p className="text-xl md:text-2xl mb-8 opacity-90 leading-relaxed">
            {t("cta.description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {/* <Link to="/auth">
                            <Button
                                size="lg"
                                variant="secondary"
                                className="bg-background text-primary hover:bg-background/90 shadow-glow text-lg px-8 py-4 hover-scale"
                            >
                                {t("cta.startCreating")}
                            </Button>
                        </Link> */}
            {/* <Button 
              variant="outline" 
              size="lg" 
              className="bg-background text-primary hover:bg-background/90 shadow-glow text-lg px-8 py-4 hover-scale"
              onClick={() => setIsScheduleModalOpen(true)}
            >
              {t("cta.scheduleDemo")}
            </Button> */}
          </div>

          <p className="text-sm opacity-75">
            {/* {t("cta.noCard")} • {t("cta.freeTrial")} •{" "} */}
            {/* {t("cta.cancelAnytime")} */}
          </p>
        </div>
      </div>

      <ScheduleDemoModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </section>
  );
};

export default CTA;
