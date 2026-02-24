import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import Autoplay from "embla-carousel-autoplay";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromoNews {
  id: string;
  title: string;
  image_url: string;
  order_index: number;
}

interface PromoNewsCarouselProps {
  eventId: string;
}

export function PromoNewsCarousel({ eventId }: PromoNewsCarouselProps) {
  const [newsItems, setNewsItems] = useState<PromoNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchPromoNews();
  }, [eventId]);

  const fetchPromoNews = async () => {
    try {
      const { data, error } = await supabase
        .from("event_promotional_news")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setNewsItems(data || []);
    } catch (error) {
      console.error("Error fetching promotional news:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || newsItems.length === 0 || isDismissed) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <Carousel
        opts={{
          align: "center",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 5000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {newsItems.map((news) => (
            <CarouselItem key={news.id}>
              <div className="overflow-hidden">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => setIsDismissed(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="relative aspect-[4/3] w-full">
                    <img
                      src={news.image_url}
                      alt={news.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-lg" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-sm font-bold text-white line-clamp-2">
                        {news.title}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {newsItems.length > 1 && (
          <>
            <CarouselPrevious className="left-2 h-8 w-8" />
            <CarouselNext className="right-2 h-8 w-8" />
          </>
        )}
      </Carousel>
    </Card>
  );
}
