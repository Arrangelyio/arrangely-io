import { useState, useEffect, useRef } from "react";
import { Trophy, Sparkles, X } from "lucide-react";
import { TierAssessmentModal } from "./TierAssessmentModal";
import { motion, AnimatePresence } from "framer-motion";
import logoGram from "@/assets/logo-gram.png";

export const FloatingTestButton = () => {
  const [showModal, setShowModal] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const constraintsRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    if (!mobile) {
      setIsExpanded(true); // desktop always expanded
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowLogo((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleMainClick = () => {
    if (!isExpanded && isMobile) setIsExpanded(true);
    else setShowModal(true);
  };

  const handleMinimize = (e) => {
    e.stopPropagation();
    if (isMobile) setIsExpanded(false);
  };

  return (
    <>
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-50"
      >
        <motion.div
          {...(isMobile
            ? {
                drag: "y",
                dragConstraints: constraintsRef,
                dragMomentum: false,
                dragElastic: 0.08,
              }
            : {})}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="
            pointer-events-auto
            fixed
            bottom-28 right-4
            md:bottom-[110px] md:right-6
            flex flex-col items-end gap-2
          "
        >
          {/* Tooltip mini */}
          <AnimatePresence>
            {!isExpanded && isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.9 }}
                className="bg-black/80 text-white text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-sm mr-1 shadow-sm"
              >
                Tes Level
              </motion.div>
            )}
          </AnimatePresence>

          {/* BUTTON */}
          <motion.button
            layout
            onClick={handleMainClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative h-9 md:h-16 rounded-full 
              bg-gradient-to-r from-[#0A1D4D] via-[#1E3A8A] to-[#0B58CA]
              text-white font-bold 
              shadow-[0_2px_0_0_rgba(30,64,175,1)] md:shadow-[0_8px_0_0_rgba(30,64,175,1)]
              transition-shadow duration-150 flex items-center group overflow-hidden
              ${
                isExpanded
                  ? "px-3 md:px-8 gap-2 md:gap-3"
                  : "w-9 justify-center md:w-16"
              } 
            `}
          >
            {/* Shine Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />

            {/* Icon */}
            <motion.div
              layout="position"
              className="relative w-4 h-4 md:w-8 md:h-8 shrink-0"
            >
              <AnimatePresence mode="wait">
                {showLogo ? (
                  <motion.img
                    key="logo"
                    src={logoGram}
                    alt="Test Logo"
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, y: [0, -3, 0] }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                    transition={{
                      duration: 0.3,
                      y: { duration: 1.5, repeat: Infinity },
                    }}
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-lg"
                  />
                ) : (
                  <motion.div
                    key="trophy"
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: [0, -10, 10, -10, 0],
                    }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                    transition={{
                      duration: 0.3,
                      rotate: { duration: 0.5, repeat: Infinity, repeatDelay: 2 },
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Trophy className="w-3.5 h-3.5 md:w-8 md:h-8 text-white drop-shadow-lg" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
                >
                  <span className="text-xs md:text-lg drop-shadow-md">
                    Test Your Level
                  </span>

                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <Sparkles className="w-3 h-3 md:w-5 md:h-5 text-white drop-shadow-lg" />
                  </motion.div>

                  {isMobile && (
                    <>
                      <div className="w-[1px] h-4 bg-white/30 mx-1" />
                      <div
                        role="button"
                        onClick={handleMinimize}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-20"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4 text-white/90 hover:text-white" />
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>

      <TierAssessmentModal
        open={showModal}
        onClose={() => setShowModal(false)}
        allowRetake={true}
      />
    </>
  );
};
