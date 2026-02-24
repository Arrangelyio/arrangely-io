import { Crown, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreatorDashboardHeaderProps {
  profile: {
    name: string;
    profileImage: string;
    topCreator: boolean;
  };
  stats: {
    followers: number;
  };
  totalArrangements: number;
}

const CreatorDashboardHeader = ({ profile, stats, totalArrangements }: CreatorDashboardHeaderProps) => {
  return (
    <div className="flex items-center gap-4 mb-8">
      <Avatar className="h-12 w-12">
        <AvatarImage src={profile.profileImage} />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          {profile.topCreator && (
            <Badge className="bg-gradient-worship text-primary-foreground">
              <Crown className="h-3 w-3 mr-1" />
              Top Creator
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {stats.followers} followers
          </span>
          <span>{totalArrangements} arrangements</span>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboardHeader;