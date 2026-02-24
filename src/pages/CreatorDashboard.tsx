// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import CreatorSidebar from "@/components/creator/CreatorSidebar";
import CreatorHeader from "@/components/creator/CreatorHeader";
import CreatorDashboardContent from "@/components/creator/CreatorDashboardContent";
import { useToast } from "@/hooks/use-toast";
import { CreatorDashboardProvider } from "@/components/creator/CreatorDashboardContext";
import AdminCreatorFilter from "@/components/creator/AdminCreatorFilter";
import { MusicAnimatedBackground } from "@/components/backgrounds/MusicAnimatedBackground";

const CreatorDashboard = () => {
  const location = useLocation();
  const initialTab = location.state?.activeTab || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalDownloads: 0,
    salesThisMonth: 0,
    totalEarnings: "Rp0",
    followers: 0,
    sequencerSales: 0,
    sequencerEarnings: 0,
    totalPublished: 0,
    totalPrivate: 0
  });
  const [walletData, setWalletData] = useState<any>(null);
  
  // Admin filter state
  const [selectedCreatorType, setSelectedCreatorType] = useState<string>("all");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedCreatorName, setSelectedCreatorName] = useState<string | null>(null);
  
  const { user, role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const isAdmin = role === 'admin' || role === 'support_admin';

  // Handle creator type filter change
  const handleCreatorTypeChange = useCallback((value: string) => {
    setSelectedCreatorType(value);
    setSelectedCreatorId(null);
    setSelectedCreatorName(null);
  }, []);

  // Handle specific creator selection
  const handleCreatorSelect = useCallback((creatorId: string | null, creatorName: string | null) => {
    setSelectedCreatorId(creatorId);
    setSelectedCreatorName(creatorName);
  }, []);

  useEffect(() => {
    if (!roleLoading && user) {
      if (role !== 'creator' && role !== 'admin' && role !== 'support_admin') {
        toast({
          title: "Access Denied",
          description: "You need creator status to access this dashboard.",
          variant: "destructive",
        });
        return;
      }
      fetchCreatorData();
    }
  }, [user, role, roleLoading, selectedCreatorType, selectedCreatorId]);

  const fetchCreatorData = async () => {
    try {
      setLoading(true);
      
      // Determine which creator to fetch data for
      let targetCreatorId: string;
      
      if (isAdmin && selectedCreatorId) {
        // Admin selected a specific creator
        targetCreatorId = selectedCreatorId;
      } else {
        // Regular creator or admin viewing own data
        targetCreatorId = user?.id;
      }

      // Fetch profile for display
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetCreatorId)
        .single();

      if (profileData) {
        setProfile({
          userId: profileData.user_id,
          name: selectedCreatorName || profileData.display_name || 'Creator',
          username: profileData.display_name?.toLowerCase().replace(/\s+/g, '-') || 'creator',
          bio: profileData.bio || 'Music creator and arranger',
          followers: 0,
          totalArrangements: 0,
          topCreator: role === 'admin',
          profileImage: profileData.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=creator",
          socialLinks: {
            instagram: "",
            youtube: "",
            facebook: ""
          },
          introductionVideoUrl: profileData.introduction_video_url,
          introductionTitle: profileData.introduction_title,
          introductionDescription: profileData.introduction_description
        });
      }

      // Fetch earnings for target creator
      const { data: earningsData } = await supabase
        .rpc('get_creator_earnings', { creator_id: targetCreatorId });
      
      const earnings = earningsData?.[0] || { total_earnings: 0, monthly_earnings: 0 };
      const totalEarningsSum = earnings.total_earnings || 0;
      const monthlyEarningsSum = earnings.monthly_earnings || 0;

      // Fetch wallet data (only for own account, not when viewing other creators)
      if (!isAdmin || !selectedCreatorId) {
        const { data: walletResponse } = await supabase
          .rpc('get_or_create_wallet', { creator_id_param: user?.id });
        setWalletData(walletResponse);
      } else {
        setWalletData(null);
      }

      // Fetch songs for target creator
      const { data: songsData } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', targetCreatorId)
        .eq('is_production', true)
        .is('original_creator_id', null);

      if (songsData) {
        // Get library counts for each song
        const songsWithLibraryCounts = await Promise.all(
          songsData.map(async (song) => {
            const { count } = await supabase
              .from('user_library_actions')
              .select('*', { count: 'exact', head: true })
              .eq('song_original_id', song.id)
              .eq('is_production', true);
            
            return {
              ...song,
              library_count: count || 0
            };
          })
        );

        const arrangements = songsWithLibraryCounts.map(song => {
          const libraryEarnings = (song.library_count || 0) * 250;
          
          return {
            id: song.id,
            title: song.title,
            artist: song.artist || 'Unknown',
            type: song.sequencer_price > 0 ? 'premium' : 'free',
            price: song.sequencer_price > 0 ? `Rp${song.sequencer_price.toLocaleString()}` : 'Free',
            views: song.views_count || 0,
            downloads: song.library_count || 0,
            earnings: libraryEarnings > 0 ? `Rp${libraryEarnings.toLocaleString()}` : 'Rp0',
            status: song.is_public ? 'published' : 'private',
            createdAt: song.created_at
          };
        });

        setSongs(arrangements);

        // Calculate stats
        const totalViews = songsWithLibraryCounts.reduce((sum, song) => sum + (song.views_count || 0), 0);
        const totalLibraryAdds = songsWithLibraryCounts.reduce((sum, song) => sum + (song.library_count || 0), 0);
        
        const totalPublished = songsWithLibraryCounts.filter(song => song.is_public === true).length;
        const totalPrivate = songsWithLibraryCounts.filter(song => song.is_public === false).length;
        
        // Fetch followers count for target creator
        const { count: followersCount } = await supabase
          .from('user_follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetCreatorId);
        const totalFollowers = followersCount || 0;
        
        // Fetch sequencer earnings for target creator
        let sequencerSales = 0;
        let sequencerEarnings = 0;
        
        const { data: sequencerData } = await supabase
          .from("sequencer_enrollments")
          .select(`
            id,
            payment:payments!sequencer_enrollments_payment_id_fkey (
              amount,
              status
            ),
            sequencer_file:sequencer_files!sequencer_enrollments_sequencer_file_id_fkey (
              song:songs!sequencer_files_song_id_fkey (
                user_id
              )
            )
          `)
          .eq("is_production", true);

        if (sequencerData) {
          const creatorEnrollments = sequencerData.filter((enrollment: any) => {
            const songCreatorId = enrollment.sequencer_file?.song?.user_id;
            const paymentStatus = enrollment.payment?.status;
            return songCreatorId === targetCreatorId && paymentStatus === "paid";
          });

          sequencerSales = creatorEnrollments.length;
          const totalSequencerAmount = creatorEnrollments.reduce((sum: number, enrollment: any) => {
            return sum + (enrollment.payment?.amount || 0);
          }, 0);
          sequencerEarnings = Math.round(totalSequencerAmount * 0.7);
        }

        setStats({
          totalViews,
          totalDownloads: totalLibraryAdds,
          salesThisMonth: monthlyEarningsSum,
          totalEarnings: `Rp${(totalEarningsSum + sequencerEarnings).toLocaleString()}`,
          followers: totalFollowers,
          sequencerSales,
          sequencerEarnings,
          totalPublished,
          totalPrivate
        });

        if (profileData) {
          setProfile(prev => ({
            ...prev,
            totalArrangements: songsWithLibraryCounts.length
          }));
        }
      }

    } catch (error) {
      console.error('Error fetching creator data:', error);
      toast({
        title: "Error",
        description: "Failed to load creator data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const resetStats = () => {
    setSongs([]);
    setStats({
      totalViews: 0,
      totalDownloads: 0,
      salesThisMonth: 0,
      totalEarnings: "Rp0",
      followers: 0,
      sequencerSales: 0,
      sequencerEarnings: 0,
      totalPublished: 0,
      totalPrivate: 0
    });
    setProfile(null);
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary relative pt-16 flex items-center justify-center">
        <MusicAnimatedBackground variant="minimal" />
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading creator dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || (role !== 'creator' && role !== 'admin' && role !== 'support_admin')) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary relative pt-16 flex items-center justify-center">
        <MusicAnimatedBackground variant="minimal" />
        <div className="text-center relative z-10">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You need creator status to access this dashboard.</p>
        </div>
      </div>
    );
  }

  const availableArrangements = songs.map(arr => ({
    id: arr.id,
    title: arr.title,
    artist: arr.artist
  }));

  const featuredArrangements = songs.slice(0, 3).map(arr => ({
    id: arr.id,
    title: arr.title,
    artist: arr.artist,
    type: arr.type,
    price: arr.type === "premium" ? arr.price : undefined,
    views: arr.views
  }));

  return (
    <CreatorDashboardProvider value={{ activeTab, setActiveTab, selectedLessonId, setSelectedLessonId }}>
      <div className="min-h-screen bg-gradient-sanctuary relative">
        <MusicAnimatedBackground variant="subtle" />
        <div className="flex relative z-10">
          <CreatorSidebar 
            isOpen={sidebarOpen} 
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          
          <div className={`flex-1 transition-all duration-300`}>
            <CreatorHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            
            <main className="p-6">
              {/* Admin-only Creator Type Filter */}
              {isAdmin && (
                <div className="mb-6">
                  <AdminCreatorFilter
                    selectedCreatorType={selectedCreatorType}
                    onCreatorTypeChange={handleCreatorTypeChange}
                    selectedCreatorId={selectedCreatorId}
                    onCreatorSelect={handleCreatorSelect}
                  />
                </div>
              )}
              
              <CreatorDashboardContent
                activeTab={activeTab}
                stats={stats}
                arrangements={songs}
                bundles={[]}
                earnings={{
                  totalEarnings: stats.totalEarnings,
                  pendingWithdrawal: walletData ? `Rp${walletData.available_amount.toLocaleString()}` : "Rp0",
                  thisMonth: `Rp${stats.salesThisMonth.toLocaleString()}`,
                  lastWithdrawal: "No withdrawals yet"
                }}
                arrangementEarnings={songs.map((song, index) => ({
                  id: index + 1,
                  title: song.title,
                  sales: song.downloads,
                  revenue: song.earnings,
                  platformFee: "Rp0",
                  netEarnings: song.earnings
                }))}
                creatorProfile={profile}
                featuredArrangements={featuredArrangements}
                availableArrangements={availableArrangements}
                isAdmin={isAdmin}
                selectedCreatorType={selectedCreatorType}
                filteredCreatorIds={selectedCreatorId ? [selectedCreatorId] : []}
              />
            </main>
          </div>
        </div>
      </div>
    </CreatorDashboardProvider>
  );
};

export default CreatorDashboard;