import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChordMasterOverview from "@/components/admin/chord-master/ChordMasterOverview";
import ChordLibraryTable from "@/components/admin/chord-master/ChordLibraryTable";
import ChordReviewQueue from "@/components/admin/chord-master/ChordReviewQueue";
import ChordAuditLog from "@/components/admin/chord-master/ChordAuditLog";

const AdminChordMaster = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chord Master</h1>
        <p className="text-muted-foreground">
          Manage accurate chord shapes and voicings for Guitar and Piano across all Arrangely songs
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="library">Chord Library</TabsTrigger>
          <TabsTrigger value="review">Review Queue</TabsTrigger>
          {/* <TabsTrigger value="audit">Audit Log</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ChordMasterOverview />
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <ChordLibraryTable />
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <ChordReviewQueue />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <ChordAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminChordMaster;