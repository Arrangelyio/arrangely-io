import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface ComingSoonProps {
  title?: string;
  description?: string;
  expectedDate?: string;
  showBackButton?: boolean;
}

const ComingSoon = ({ 
  title, 
  description,
  expectedDate,
  showBackButton = true 
}: ComingSoonProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const finalTitle = title || t("common.comingSoon");
  const finalDescription = description || t("common.comingSoonDesc");

  return (
    <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">{finalTitle}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {finalDescription}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {expectedDate && (
            <div className="text-sm text-muted-foreground">
              Expected availability: {expectedDate}
            </div>
          )}
          
          {showBackButton && (
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.goBack")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;