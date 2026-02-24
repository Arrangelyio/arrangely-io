import DashboardStats from "./DashboardStats";
import DashboardRevenueOverview from "./DashboardRevenueOverview";
import ArrangementsList from "./ArrangementsList";
import EarningsPage from "./EarningsPage";
import BundlesPage from "./BundlesPage";
import CreatorProfile from "./CreatorProfile";
import CreatorApplicationsManagement from "./CreatorApplicationsManagement";
import VoucherDisplay from "./VoucherDisplay";
import AdminChordMaster from "../../pages/admin/AdminChordMaster";
import RequestSongs from "../../pages/RequestSongs";
import { CreatorEventsManagement } from "./CreatorEventsManagement";
import CreatorLessonsPanel from "./CreatorLessonsPanel";
import CreateLesson from "../../pages/CreateLesson";
import { useCreatorDashboard } from "./CreatorDashboardContext";
import PerformanceReviews from "../../pages/creator/PerformanceReviews";
import LessonEarnings from "./LessonEarnings";
import SequencerEarnings from "./SequencerEarnings";

interface CreatorDashboardContentProps {
  activeTab: string;
  stats: any;
  arrangements: any[];
  bundles: any[];
  earnings: any;
  arrangementEarnings: any[];
  creatorProfile: any;
  featuredArrangements: any[];
  availableArrangements: any[];
  isAdmin?: boolean;
  selectedCreatorType?: string;
  filteredCreatorIds?: string[];
}

const CreatorDashboardContent = ({
  activeTab,
  stats,
  arrangements,
  bundles,
  earnings,
  arrangementEarnings,
  creatorProfile,
  featuredArrangements,
  availableArrangements,
  isAdmin = false,
  selectedCreatorType = "all",
  filteredCreatorIds = []
}: CreatorDashboardContentProps) => {
  const { setActiveTab } = useCreatorDashboard();
  
  // Determine which creatorId(s) to pass to child components
  // When admin selects a specific creator, use that creator's ID
  // Otherwise fall back to the logged-in user's profile
  // Determine which creatorId(s) to pass to child components
  // Priority: filteredCreatorIds (admin selection) > creatorProfile.userId (fetched profile)
  const effectiveCreatorId = filteredCreatorIds.length > 0
    ? filteredCreatorIds[0]
    : creatorProfile?.userId || "";
  
  // Check if admin has selected a creator type but not a specific creator
  const isAdminWithoutSelection = isAdmin && selectedCreatorType !== "all" && filteredCreatorIds.length === 0;
  
  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <DashboardStats stats={stats} isFiltered={isAdmin && selectedCreatorType !== "all"} />
            <DashboardRevenueOverview 
              creatorId={effectiveCreatorId}
              isAdmin={isAdmin}
              selectedCreatorType={selectedCreatorType}
              filteredCreatorIds={filteredCreatorIds}
              isAdminWithoutSelection={isAdminWithoutSelection}
            />
            {/* <ArrangementsList /> */}
          </div>
        );
      case "arrangements":
        return <ArrangementsList />;
      case "lessons":
        return <CreatorLessonsPanel creatorProfile={creatorProfile} />;
      case "performance-reviews":
        return <PerformanceReviews />;
      case "create-lesson":
        return (
          <CreateLesson 
            onBack={() => setActiveTab("lessons")} 
            onSuccess={(lessonId) => {
              setActiveTab("lessons");
              // The lesson detail will be shown in the lessons panel via selectedLessonId
            }}
          />
        );
      case "events":
        return <CreatorEventsManagement />;
      case "bundles":
        return <BundlesPage bundles={bundles} availableArrangements={availableArrangements} />;
      case "earnings":
        return (
          <EarningsPage 
            earnings={earnings} 
            arrangementEarnings={arrangementEarnings}
            creatorId={creatorProfile?.userId || ""} 
          />
        );
      case "lesson-earnings":
        return <LessonEarnings creatorId={effectiveCreatorId} />;
      case "sequencer-earnings":
        return <SequencerEarnings creatorId={effectiveCreatorId} />;
      case "vouchers":
        return <VoucherDisplay creatorId={creatorProfile?.userId || ""} />;
      case "chord-master":
        return <AdminChordMaster />;
      case "profile":
        return <CreatorProfile profile={creatorProfile} featuredArrangements={featuredArrangements} />;
      case "applications":
        return <CreatorApplicationsManagement />;
      case "request-songs":
        return <RequestSongs />;
      case "pro-upgrade":
        return (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gradient-worship rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👑</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Upgrade to Pro Creator</h3>
              <p className="text-muted-foreground mb-6">
                Unlock advanced features, higher earnings, and exclusive opportunities
              </p>
              <a href="/pro-creator-onboarding">
                <button className="bg-gradient-worship hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium">
                  Apply for Pro Status
                </button>
              </a>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Settings</h3>
            <p className="text-muted-foreground">Account settings and preferences coming soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return <>{renderContent()}</>;
};

export default CreatorDashboardContent;