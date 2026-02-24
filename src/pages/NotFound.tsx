import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, Music, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: Page not found:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 
      bg-gradient-to-b from-[#0A1A3A] via-[#132657] to-[#1A2E66]">

      {/* Soft floating glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-24 left-16 w-72 h-72 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-24 right-20 w-72 h-72 bg-blue-300/20 rounded-full blur-[120px]" />
      </div>

      {/* Elegant Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
        className="relative z-10 w-full max-w-xl 
        bg-white/10 backdrop-blur-xl 
        border border-white/20 
        rounded-3xl shadow-2xl px-10 py-12 text-center"
      >
        {/* Floating Icon */}
        <motion.div
          animate={{ rotate: [0, 3, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="w-24 h-24 rounded-full mx-auto mb-6
            bg-gradient-to-tr from-primary/20 to-blue-300/30
            flex items-center justify-center shadow-lg shadow-blue-800/20"
        >
          <Music className="h-11 w-11 text-white drop-shadow" />
        </motion.div>

        {/* Main Title */}
        <h1 className="text-7xl font-black tracking-tight 
          bg-gradient-to-r from-white to-blue-300 
          bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="text-xl font-semibold text-blue-100 mt-2">
          Oops, this page missed the beat
        </h2>

        <p className="text-blue-200/80 text-sm max-w-sm mx-auto mt-4 mb-10 leading-relaxed">
          The page you’re trying to reach is unavailable or moved.  
          Let’s take you back to the music.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">

          {/* Primary Button */}
          <Button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-6 py-5 rounded-xl text-white 
              bg-gradient-to-r from-primary to-blue-500 
              hover:brightness-110 shadow-lg"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Button>

          {/* Secondary Button */}
          <Button
            onClick={() => navigate("/community-library")}
            variant="outline"
            className="flex items-center gap-2 px-6 py-5 rounded-xl
              border-white/30 text-black hover:bg-white/10 backdrop-blur"
          >
            <Search className="h-4 w-4" />
            Browse Songs
          </Button>

        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
