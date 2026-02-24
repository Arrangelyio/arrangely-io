import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Download, FileCheck, FileLock, Users } from "lucide-react";

interface StatsData {
    totalViews: number;
    totalDownloads: number;
    salesThisMonth: number;
    totalEarnings: string;
    followers: number;
    sequencerSales?: number;
    sequencerEarnings?: number;
    totalPublished?: number;
    totalPrivate?: number;
}

interface DashboardStatsProps {
    stats: StatsData;
}

const DashboardStats = ({
    stats,
}: {
    stats: StatsData;
    isFiltered: boolean;
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Views
                    </CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.totalViews.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        All song views
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Library Adds
                    </CardTitle>
                    <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.totalDownloads}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Songs added to libraries
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Songs Published
                    </CardTitle>
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                        {stats.totalPublished || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Public arrangements
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Songs Private
                    </CardTitle>
                    <FileLock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                        {stats.totalPrivate || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Private arrangements
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Followers
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.followers.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Users following you
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardStats;
