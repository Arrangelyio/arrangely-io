import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Guitar, Music, Layers, Church, PenTool } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CategoryStats {
  category: string;
  count: number;
}

const LessonCategoriesGrid = () => {
  const { t } = useLanguage();
  const [categoryCounts, setCategoryCounts] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryConfig = [
    {
      name: t("LessonHome.instrument"),
      icon: Guitar,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      name: t("LessonHome.theory"),
      icon: Music,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      name: t("LessonHome.prod"),
      icon: Layers,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      name: t("LessonHome.worshipLeading"),
      icon: Church,
      color: "from-amber-500 to-yellow-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      name: t("LessonHome.songWriting"),
      icon: PenTool,
      color: "from-red-500 to-orange-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
  ];

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const categoryNames = categoryConfig.map((c) => c.name);
        const counts = await Promise.all(
          categoryNames.map(async (category) => {
            const { count } = await supabase
              .from("lessons")
              .select("*", { count: "exact", head: true })
              .eq("status", "published")
              .eq("is_unlisted", false)
              .eq("category", category);

            return { category, count: count || 0 };
          })
        );

        setCategoryCounts(counts);
      } catch (error) {
        console.error("Error fetching category counts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryCounts();
  }, []);

  const getCountForCategory = (categoryName: string) => {
    return categoryCounts.find((c) => c.category === categoryName)?.count || 0;
  };

  if (loading) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-2">
            {/* Explore by Category */}
            {t("LessonHome.title3")}
          </h2>
          <p className="text-muted-foreground">
            {/* Find the perfect lessons for your musical journey */}
            {t("LessonHome.desc2")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryConfig.map((category, index) => {
            const count = getCountForCategory(category.name);
            const IconComponent = category.icon;

            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link
                  to={`/arrangely-music-lab?category=${encodeURIComponent(category.name)}`}
                >
                  <Card
                    className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${category.borderColor} overflow-hidden cursor-pointer`}
                  >
                    <CardContent className="p-6 text-center space-y-4">
                      {/* Icon Container */}
                      <div className="relative mx-auto w-20 h-20">
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${category.color} rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity`}
                        />
                        <div
                          className={`relative w-full h-full ${category.bgColor} rounded-2xl flex items-center justify-center border ${category.borderColor} group-hover:scale-110 transition-transform`}
                        >
                          <IconComponent className="w-10 h-10 text-primary" />
                        </div>
                      </div>

                      {/* Category Name */}
                      <div>
                        <h3 className="font-semibold text-lg text-primary group-hover:text-blue-600 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {count} {count === 1 ? "lesson" : "lessons"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default LessonCategoriesGrid;
