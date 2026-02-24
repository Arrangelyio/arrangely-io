import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Headphones,
  Music,
  Shield,
  Zap,
  Apple,
  ArrowLeft,
  CheckCircle,
  Share2,
  MousePointerClick,
  Lock,
  Users,
  ListMusic,
  Play,
  WifiOff,
  Download,
  CloudOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import arrangelyLogoGram from "@/assets/arrangely-logo-gram.png";
import { useLanguage } from "@/contexts/LanguageContext";

const DesktopAppDownload = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const features = [
    {
      icon: Headphones,
      title: t("downloadApp.multiTrack"),
      description:
        // "Control individual tracks, adjust volumes, and create perfect mixes for your performance",
        t("downloadApp.multiTrackDesc"),
    },
    {
      icon: Music,
      title: t("downloadApp.realtime"),
      description: t("downloadApp.realtimeDesc"),
    },
    {
      icon: Shield,
      title: t("downloadApp.secureAccess"),
      description: t("downloadApp.secureAccessDesc"),
    },
    {
      icon: Zap,
      title: t("downloadApp.lowLatency"),
      description: t("downloadApp.lowLatencyDesc"),
    },
  ];

  const advancedFeatures = [
    {
      icon: Share2,
      title: t("downloadApp.liveSync"),
      description:
        // "Sync your chord arrangements with your team in real-time. Share live preview with other devices and play sequencer as MD (Music Director). The sequencer controls the arrangement automatically - sections move in sync with the sequencer playback. No manual section navigation needed!",
        t("downloadApp.syncYour"),
      highlights: [
        // "MD controls arrangement from sequencer",
        t("downloadApp.mdControl"),
        t("downloadApp.automatic"),
        t("downloadApp.realtimeSync"),
        t("downloadApp.shareLive"),
      ],
    },
    {
      icon: MousePointerClick,
      title: t("downloadApp.instantSection"),
      description: t("downloadApp.needToJump"),
      highlights: [
        t("downloadApp.oneClick"),
        t("downloadApp.fullControl"),
        t("downloadApp.perfectFor"),
        t("downloadApp.jumpFrom "),
      ],
    },
    {
      icon: Lock,
      title: t("downloadApp.creatorSecurity"),
      description: t("downloadApp.forProfessional"),
      highlights: [
        t("downloadApp.noRaw"),
        t("downloadApp.protectYour"),
        t("downloadApp.encrypted"),
        t("downloadApp.safeFor"),
      ],
    },
    {
      icon: WifiOff,
      title: t("downloadApp.offlineMode"),
      description: t("downloadApp.syncAndDownload"),
      highlights: [
        t("downloadApp.syncNDownload"),
        t("downloadApp.fullOffline"),
        t("downloadApp.playWithout"),
        t("downloadApp.noStage"),
      ],
    },
  ];

  const handleDownloadWindows = () => {
    window.open(
      "https://arrangely.io/downloads/ArrangelyLive-Windows.exe",
      "_blank"
    );
  };

  const handleDownloadMac = () => {
    window.open(
      "https://arrangely.io/downloads/ArrangelyLive-Mac.dmg",
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back button */}
        <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src={arrangelyLogoGram}
              alt="Arrangely"
              className="h-12 w-auto"
            />
            <h1 className="text-4xl font-bold">Arrangely Live</h1>
          </div>
          <Badge className="bg-gradient-worship text-white mb-4">
            {/* Desktop Application */}
            {t("downloadApp.desktop")}
          </Badge>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {/* Play your purchased sequencer files with full multi-track control.
            Perfect for live performances and rehearsals. */}

            {t("downloadApp.desc")}
          </p>
        </div>

        {/* Download Section */}
        <Card className="mb-8 border-white-200/50 dark:border-purple-800/30 overflow-hidden">
          <div className="bg-gradient-to-r from-white-500/10 to-pink-500/10 p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-2xl text-center">
                {/* Download Arrangely Live */}
                {t("downloadApp.buttonDownload")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="h-20 text-lg bg-gradient-worship hover:from-purple-600 hover:to-pink-600"
                  onClick={handleDownloadWindows}
                >
                  <Monitor className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Windows</div>
                    <div className="text-xs opacity-80">Windows 10/11</div>
                  </div>
                </Button>
                <Button
                  size="lg"
                  className="h-20 text-lg bg-gradient-worship hover:from-purple-600 hover:to-pink-600"
                  onClick={handleDownloadMac}
                >
                  <Apple className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">macOS</div>
                    <div className="text-xs opacity-80">macOS 11+</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Basic Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-white-200/50 dark:border-white-800/30"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-white-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-white-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Advanced Features - New Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <Badge
              variant="outline"
              className="mb-2 border-purple-500/50 text-purple-600 dark:text-purple-400"
            >
              {/* Advanced Features */}
              {t("downloadApp.advanced")}
            </Badge>
            <h2 className="text-2xl font-bold">
              {/* Powerful Live Performance Tools */}
              {t("downloadApp.powerfull")}
            </h2>
            <p className="text-muted-foreground mt-2">
              {/* Take your worship experience to the next level with these powerful
              features */}
              {t("downloadApp.takeYour")}
            </p>
          </div>

          <div className="space-y-4">
            {advancedFeatures.map((feature, index) => (
              <Card
                key={index}
                className="border-purple-200/50 dark:border-purple-800/30 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Icon Section */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 flex items-center justify-center md:w-32">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-worship flex items-center justify-center">
                        <feature.icon className="h-8 w-8 text-white" />
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 flex-1">
                      <h3 className="text-lg font-bold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {feature.description}
                      </p>

                      {/* Highlights */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {feature.highlights.map((highlight, hIndex) => (
                          <div
                            key={hIndex}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How it works */}
        <Card className="border-purple-200/50 dark:border-purple-800/30">
          <CardHeader>
            <CardTitle> {t("downloadApp.howTo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-worship text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">
                    {" "}
                    {t("downloadApp.downloadNINstall")},
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("downloadApp.downloadArrangely")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-worship text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold"> {t("downloadApp.signIn")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t("downloadApp.openTheApp")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-worship text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">
                    {" "}
                    {t("downloadApp.accessYourLibrary")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("downloadApp.allYourPurchased")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold">
                    {" "}
                    {t("downloadApp.startPlaying")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("downloadApp.selectASong")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browse more */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground mb-4">
            {t("downloadApp.lookingForMore")}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/sequencer-store")}
          >
            <Headphones className="h-4 w-4 mr-2" />
            {t("downloadApp.browseSequencerS")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DesktopAppDownload;
