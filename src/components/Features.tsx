import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { t } = useLanguage();
  
  const features = [
    {
      titleKey: "features.communityLibrary.title",
      descriptionKey: "features.communityLibrary.description",
      icon: "🏛️",
      featured: true
    },
    {
      titleKey: "features.aiSongAnalysis.title",
      descriptionKey: "features.aiSongAnalysis.description",
      icon: "🎵"
    },
    {
      titleKey: "features.chordLyricEditor.title",
      descriptionKey: "features.chordLyricEditor.description",
      icon: "✏️"
    },
    {
      titleKey: "features.instantTranspose.title",
      descriptionKey: "features.instantTranspose.description",
      icon: "🎸"
    },
    {
      titleKey: "features.teamCollaboration.title",
      descriptionKey: "features.teamCollaboration.description",
      icon: "👥"
    },
    {
      titleKey: "features.setlistPlanner.title",
      descriptionKey: "features.setlistPlanner.description",
      icon: "📋"
    }
  ];

  return (
    <section id="features" className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            {t("features.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("features.description")}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={`border-border hover:shadow-worship transition-all duration-300 hover:-translate-y-1 ${
                feature.featured ? 'ring-2 ring-accent/50 bg-gradient-to-br from-accent/5 to-primary/5' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-4xl">{feature.icon}</div>
                  {feature.featured && (
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">
                      {t("features.popular")}
                    </span>
                  )}
                </div>
                <CardTitle className="text-primary text-xl">{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {t(feature.descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;