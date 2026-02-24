import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Package, Edit, Trash2, ExternalLink } from "lucide-react";
import BundleDetailsModal from "./BundleDetailsModal";

interface Bundle {
  id: number;
  title: string;
  description: string;
  price: string;
  songs: string[];
  sales: number;
  revenue: string;
  status: "published" | "draft";
}

interface BundlesPageProps {
  bundles: Bundle[];
  availableArrangements: { id: number; title: string; artist: string }[];
}

const BundlesPage = ({ bundles, availableArrangements }: BundlesPageProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<number[]>([]);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);

  const handleSongToggle = (songId: number) => {
    setSelectedSongs(prev => 
      prev.includes(songId) 
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Song Bundles</h2>
          <p className="text-muted-foreground">Group your arrangements into themed collections</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedBundle(null);
            setShowBundleModal(true);
          }}
          className="bg-gradient-worship hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      {/* Create Bundle Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Bundle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bundle-title">Bundle Title</Label>
                <Input 
                  id="bundle-title"
                  placeholder="e.g., Christmas Worship Pack"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bundle-price">Price (Rp)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15000">Rp15.000</SelectItem>
                    <SelectItem value="25000">Rp25.000</SelectItem>
                    <SelectItem value="35000">Rp35.000</SelectItem>
                    <SelectItem value="50000">Rp50.000</SelectItem>
                    <SelectItem value="75000">Rp75.000</SelectItem>
                    <SelectItem value="100000">Rp100.000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundle-description">Description</Label>
              <Textarea 
                id="bundle-description"
                placeholder="Describe your bundle and what makes it special..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Arrangements</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-4">
                {availableArrangements.map((arrangement) => (
                  <div key={arrangement.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`song-${arrangement.id}`}
                      checked={selectedSongs.includes(arrangement.id)}
                      onCheckedChange={() => handleSongToggle(arrangement.id)}
                    />
                    <Label 
                      htmlFor={`song-${arrangement.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {arrangement.title} - {arrangement.artist}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedSongs.length} arrangements
              </p>
            </div>

            <div className="flex gap-2">
              <Button className="bg-gradient-worship hover:opacity-90">
                Create Bundle
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Bundles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map((bundle) => (
          <Card key={bundle.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{bundle.title}</CardTitle>
                    <Badge 
                      variant={bundle.status === "published" ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {bundle.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedBundle(bundle);
                      setShowBundleModal(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{bundle.description}</p>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Includes {bundle.songs.length} songs:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {bundle.songs.slice(0, 3).map((song, index) => (
                    <li key={index}>• {song}</li>
                  ))}
                  {bundle.songs.length > 3 && (
                    <li>• +{bundle.songs.length - 3} more songs</li>
                  )}
                </ul>
              </div>
              
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Price:</span>
                  <span className="font-bold text-primary">{bundle.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Sales:</span>
                  <span>{bundle.sales}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Revenue:</span>
                  <span className="font-bold text-green-600">{bundle.revenue}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bundles.length === 0 && !showCreateForm && (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No bundles yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first bundle to group arrangements and increase sales
            </p>
            <Button 
              onClick={() => {
                setSelectedBundle(null);
                setShowBundleModal(true);
              }}
              className="bg-gradient-worship hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Bundle
            </Button>
          </CardContent>
        </Card>
      )}

      <BundleDetailsModal
        open={showBundleModal}
        onOpenChange={setShowBundleModal}
        bundle={selectedBundle}
        availableArrangements={availableArrangements.map(arr => ({
          id: arr.id,
          title: arr.title,
          artist: arr.artist,
          type: "premium" as const,
          price: "15000",
          downloads: Math.floor(Math.random() * 100)
        }))}
      />
    </div>
  );
};

export default BundlesPage;
