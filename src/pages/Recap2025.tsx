import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Share2, Copy, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RecapSlide, { StaggerText, BounceEmoji } from '@/components/recap/RecapSlide';
import RecapProgress from '@/components/recap/RecapProgress';
import CountUpNumber from '@/components/recap/CountUpNumber';

const TOTAL_SLIDES = 10;

// Gradient backgrounds for each slide
const slideBackgrounds = [
  "bg-gradient-to-br from-[hsl(221,83%,21%)] to-[hsl(38,92%,50%)]", // Cover
  "bg-gradient-to-br from-[hsl(221,83%,15%)] to-[hsl(221,83%,30%)]", // Journey
  "bg-gradient-to-br from-emerald-600 to-teal-700", // Community
  "bg-gradient-to-br from-[hsl(38,92%,50%)] to-[hsl(35,91%,40%)]", // Creators
  "bg-gradient-to-br from-violet-600 to-indigo-700", // Usage
  "bg-gradient-to-br from-red-500 to-orange-500", // Momentum
  "bg-gradient-to-br from-[hsl(221,83%,21%)] to-[hsl(38,72%,45%)]", // Evolution
  "bg-gradient-to-br from-blue-600 to-violet-600", // 2026 Preview
  "bg-gradient-to-br from-rose-500 to-pink-600", // Thank You
  "bg-gradient-to-br from-[hsl(221,83%,21%)] to-[hsl(38,92%,50%)]", // Share
];

export default function Recap2025() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const navigate = useNavigate();

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < TOTAL_SLIDES) {
      setCurrentSlide(index);
    }
  }, []);

  const nextSlide = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, navigate]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    
    setTouchStart(null);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = "Arrangely 2025 Recap: Dari Ide Menjadi Karya 🎶";
    
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link berhasil disalin!");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link berhasil disalin!");
  };

  return (
    <div 
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation Arrows (Desktop) */}
      <div className="hidden md:flex fixed inset-y-0 left-4 items-center z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      </div>
      <div className="hidden md:flex fixed inset-y-0 right-4 items-center z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === TOTAL_SLIDES - 1}
          className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      </div>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/')}
        className="fixed top-4 right-4 z-50 text-white/70 hover:text-white hover:bg-white/10"
      >
        <Home className="w-5 h-5" />
      </Button>

      {/* Slides */}
      <AnimatePresence mode="wait">
        {/* Slide 1: Cover */}
        <RecapSlide 
          background={slideBackgrounds[0]} 
          isActive={currentSlide === 0}
          backgroundType="brand"
        >
          <StaggerText>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Rekap Arrangely 2025
            </h1>
          </StaggerText>
          <StaggerText delay={0.2}>
            <p className="text-lg md:text-xl text-white/80 mb-6">
              17 Sep – 31 Des 2025
            </p>
          </StaggerText>
          <StaggerText delay={0.4}>
            <p className="text-xl md:text-2xl font-medium">
              Dari ide menjadi aransemen.
            </p>
            <p className="text-xl md:text-2xl font-medium">
              Dari komunitas menjadi karya.
            </p>
          </StaggerText>
          <StaggerText delay={0.6}>
            <div className="mt-8 text-4xl">
              <BounceEmoji emoji="🎶" delay={0.8} />
            </div>
          </StaggerText>
        </RecapSlide>

        {/* Slide 2: Journey Intro */}
        <RecapSlide 
          background={slideBackgrounds[1]} 
          isActive={currentSlide === 1}
          backgroundType="notation"
        >
          <StaggerText>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Dalam 3,5 bulan…
            </h2>
          </StaggerText>
          <StaggerText delay={0.3}>
            <p className="text-xl md:text-2xl text-white/90 mb-4">
              Arrangely bertumbuh dari sebuah ide
            </p>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              menjadi komunitas musik yang nyata.
            </p>
          </StaggerText>
          <StaggerText delay={0.5}>
            <p className="text-2xl md:text-3xl font-semibold">
              Dibangun bersama. <br />
              Dimainkan bersama.
            </p>
          </StaggerText>
        </RecapSlide>

        {/* Slide 3: Community Growth */}
        <RecapSlide 
          background={slideBackgrounds[2]} 
          isActive={currentSlide === 2}
          backgroundType="network"
        >
          <StaggerText>
            <h2 className="text-2xl md:text-4xl font-bold mb-8">
              Komunitas kita terus bertumbuh <BounceEmoji emoji="🚀" delay={0.3} />
            </h2>
          </StaggerText>
          <div className="space-y-6 text-left">
            <StaggerText delay={0.2}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">👥</span>
                <div>
                  <p className="text-4xl md:text-5xl font-bold">
                    <CountUpNumber end={7000} suffix="+" isActive={currentSlide === 2} />
                  </p>
                  <p className="text-white/80">pengguna</p>
                </div>
              </div>
            </StaggerText>
            <StaggerText delay={0.4}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">🎼</span>
                <div>
                  <p className="text-4xl md:text-5xl font-bold">
                    <CountUpNumber end={6500} suffix="+" isActive={currentSlide === 2} />
                  </p>
                  <p className="text-white/80">aransemen lagu</p>
                </div>
              </div>
            </StaggerText>
            <StaggerText delay={0.6}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">👀</span>
                <div>
                  <p className="text-4xl md:text-5xl font-bold">
                    <CountUpNumber end={100000} suffix="+" isActive={currentSlide === 2} />
                  </p>
                  <p className="text-white/80">total views</p>
                </div>
              </div>
            </StaggerText>
          </div>
          <StaggerText delay={0.8}>
            <p className="mt-8 text-lg md:text-xl text-white/90">
              Di Arrangely, musisi bukan hanya bermain. <br />
              <span className="font-semibold">Mereka berkarya.</span>
            </p>
          </StaggerText>
        </RecapSlide>

        {/* Slide 4: Creators Power */}
        <RecapSlide 
          background={slideBackgrounds[3]} 
          isActive={currentSlide === 3}
          backgroundType="creator"
        >
          <StaggerText>
            <h2 className="text-2xl md:text-4xl font-bold mb-8">
              Creators are the heart of Arrangely <BounceEmoji emoji="❤️" delay={0.3} />
            </h2>
          </StaggerText>
          <div className="space-y-6 text-left">
            <StaggerText delay={0.2}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">⭐</span>
                <div>
                  <p className="text-4xl md:text-5xl font-bold">
                    <CountUpNumber end={36} isActive={currentSlide === 3} />
                  </p>
                  <p className="text-white/80">creator terpercaya & terverifikasi</p>
                </div>
              </div>
            </StaggerText>
            <StaggerText delay={0.4}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">📩</span>
                <div>
                  <p className="text-4xl md:text-5xl font-bold">
                    <CountUpNumber end={244} isActive={currentSlide === 3} />
                  </p>
                  <p className="text-white/80">permintaan lagu diselesaikan</p>
                </div>
              </div>
            </StaggerText>
          </div>
          <StaggerText delay={0.6}>
            <p className="mt-8 text-xl md:text-2xl font-medium">
              Real people. <br />
              Real arrangements. <br />
              Real collaboration.
            </p>
          </StaggerText>
        </RecapSlide>

        {/* Slide 5: Usage Stats */}
        <RecapSlide 
          background={slideBackgrounds[4]} 
          isActive={currentSlide === 4}
          backgroundType="library"
        >
          <StaggerText>
            <h2 className="text-2xl md:text-4xl font-bold mb-8">
              Bagaimana Arrangely digunakan <BounceEmoji emoji="🎧" delay={0.3} />
            </h2>
          </StaggerText>
          <div className="space-y-5 text-left">
            <StaggerText delay={0.2}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">📂</span>
                <div>
                  <p className="text-3xl md:text-4xl font-bold">
                    <CountUpNumber end={4000} suffix="+" isActive={currentSlide === 4} />
                  </p>
                  <p className="text-white/80 text-sm">aransemen private</p>
                </div>
              </div>
            </StaggerText>
            <StaggerText delay={0.3}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">🌍</span>
                <div>
                  <p className="text-3xl md:text-4xl font-bold">
                    <CountUpNumber end={2500} suffix="+" isActive={currentSlide === 4} />
                  </p>
                  <p className="text-white/80 text-sm">Community Trusted Arrangements</p>
                </div>
              </div>
            </StaggerText>
            <StaggerText delay={0.4}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">❤️</span>
                <div>
                  <p className="text-3xl md:text-4xl font-bold">
                    <CountUpNumber end={2000} isActive={currentSlide === 4} />
                  </p>
                  <p className="text-white/80 text-sm">aksi library (save, like, reuse)</p>
                </div>
              </div>
            </StaggerText>
          </div>
          <StaggerText delay={0.6}>
            <p className="mt-8 text-xl md:text-2xl font-medium">
              Less noise. <br />
              <span className="text-white/90">More meaningful music.</span>
            </p>
          </StaggerText>
        </RecapSlide>

        {/* Slide 6: Active Momentum */}
        <RecapSlide 
          background={slideBackgrounds[5]} 
          isActive={currentSlide === 5}
          backgroundType="waveform"
        >
          <StaggerText>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Terus bergerak, terus aktif <BounceEmoji emoji="🔥" delay={0.3} />
            </h2>
          </StaggerText>
          <StaggerText delay={0.3}>
            <div className="text-xl md:text-2xl mb-6 flex items-center justify-center gap-3">
              <span className="text-2xl">🔁</span>
              <span>Lagu diputar ulang, digunakan ulang, dan dikembangkan</span>
            </div>
          </StaggerText>
          <StaggerText delay={0.5}>
            <p className="text-2xl md:text-3xl font-semibold mt-8">
              Bukan sekadar daftar — <br />
              <span className="text-white/90">tapi penggunaan nyata.</span>
            </p>
          </StaggerText>
        </RecapSlide>

        {/* Slide 7: Platform Evolution */}
        <RecapSlide 
          background={slideBackgrounds[6]} 
          isActive={currentSlide === 6}
          backgroundType="collaboration"
        >
          <StaggerText>
            <p className="text-2xl md:text-3xl text-white/90 mb-6">
              Arrangely is no longer just a tool.
            </p>
          </StaggerText>
          <StaggerText delay={0.3}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Arrangely sedang bertumbuh menjadi <br />
              <span className="text-accent">platform kolaborasi musik</span>
            </h2>
          </StaggerText>
          <StaggerText delay={0.5}>
            <p className="text-xl md:text-2xl">
              di mana creator dipercaya <br />
              dan musisi merasa didukung.
            </p>
          </StaggerText>
          <StaggerText delay={0.7}>
            <div className="mt-6 text-3xl">
              <BounceEmoji emoji="✨" delay={0.9} />
            </div>
          </StaggerText>
        </RecapSlide>

        {/* Slide 8: 2026 Preview */}
        <RecapSlide 
          background={slideBackgrounds[7]} 
          isActive={currentSlide === 7}
          backgroundType="mobile"
        >
          <StaggerText>
            <h2 className="text-3xl md:text-5xl font-bold mb-8">
              2026, kita melangkah lebih jauh <BounceEmoji emoji="🚀" delay={0.3} />
            </h2>
          </StaggerText>
          <StaggerText delay={0.4}>
            <div className="flex items-center justify-center gap-4 text-2xl md:text-3xl">
              <span className="text-3xl">📱</span>
              <span className="font-semibold">Aplikasi Mobile</span>
            </div>
            <p className="text-xl text-white/80 mt-2">(iOS & Android)</p>
          </StaggerText>
          <StaggerText delay={0.6}>
            <motion.div 
              className="mt-10 relative"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-32 h-56 mx-auto bg-white/10 rounded-3xl border-4 border-white/30 flex items-center justify-center backdrop-blur-sm">
                <div className="text-4xl">🎵</div>
              </div>
            </motion.div>
          </StaggerText>
        </RecapSlide>

        {/* Slide 9: Thank You */}
        <RecapSlide 
          background={slideBackgrounds[8]} 
          isActive={currentSlide === 8}
          backgroundType="confetti"
        >
          <StaggerText>
            <p className="text-xl md:text-2xl text-white/90 mb-6">
              Untuk setiap creator, musisi, <br />
              dan early believer —
            </p>
          </StaggerText>
          <StaggerText delay={0.3}>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Perjalanan ini juga milikmu. <BounceEmoji emoji="❤️" delay={0.5} />
            </h2>
          </StaggerText>
          <StaggerText delay={0.5}>
            <p className="text-2xl md:text-3xl font-medium mb-8">
              Mari buat 2026 lebih lantang. <BounceEmoji emoji="🎶" delay={0.7} />
            </p>
          </StaggerText>
          <StaggerText delay={0.7}>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-white/70">
              <span>#Arrangely</span>
              <span>#KomunitasMusik</span>
              <span>#Creator</span>
              <span>#UntukMusisi</span>
            </div>
          </StaggerText>
        </RecapSlide>

        {/* Slide 10: Share & CTA */}
        <RecapSlide 
          background={slideBackgrounds[9]} 
          isActive={currentSlide === 9}
          backgroundType="social"
        >
          <StaggerText>
            <h2 className="text-3xl md:text-5xl font-bold mb-8">
              Bagikan rekap ini! <BounceEmoji emoji="🎉" delay={0.3} />
            </h2>
          </StaggerText>
          <StaggerText delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                onClick={handleShare}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share
              </Button>
              <Button 
                onClick={copyLink}
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 gap-2"
              >
                <Copy className="w-5 h-5" />
                Copy Link
              </Button>
            </div>
          </StaggerText>
          <StaggerText delay={0.5}>
            <Button 
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </StaggerText>
          <StaggerText delay={0.7}>
            <p className="mt-8 text-sm text-white/60">
              #Arrangely #BuiltTogether #MusicCommunity #2025Recap
            </p>
          </StaggerText>
        </RecapSlide>
      </AnimatePresence>

      {/* Progress Indicator */}
      <RecapProgress 
        total={TOTAL_SLIDES} 
        current={currentSlide} 
        onDotClick={goToSlide} 
      />

      {/* Tap to advance hint (mobile) */}
      {currentSlide === 0 && (
        <motion.p 
          className="fixed bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-sm md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Swipe untuk lanjut →
        </motion.p>
      )}
    </div>
  );
}
