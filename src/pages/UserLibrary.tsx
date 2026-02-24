import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Download, 
  Play, 
  Edit, 
  Music, 
  Package, 
  Video, 
  Star,
  Calendar,
  Filter,
  Grid3x3,
  List,
  Clock,
  CheckCircle,
  ExternalLink,
  MoreHorizontal,
  RefreshCw
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

const UserLibrary = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [filterCreator, setFilterCreator] = useState("all");

  // Mock user library data
  const libraryItems = [
    {
      id: 1,
      type: "arrangement",
      title: "10,000 Reasons (Modern Style)",
      artist: "Matt Redman",
      creator: "Sarah Johnson",
      creatorAvatar: "/placeholder.svg",
      purchaseDate: "2024-01-15",
      lastAccessed: "2024-01-20",
      price: 15000,
      status: "active",
      rating: 4.8,
      thumbnail: "/placeholder.svg",
      hasVideo: true,
      hasAudio: true,
      canDownload: true,
      progress: 100 // for videos
    },
    {
      id: 2,
      type: "video",
      title: "Advanced Worship Piano Techniques",
      creator: "Michael Chen",
      creatorAvatar: "/placeholder.svg",
      purchaseDate: "2024-01-10",
      lastAccessed: "2024-01-18",
      price: 89000,
      status: "active",
      duration: "2h 30m",
      progress: 65,
      thumbnail: "/placeholder.svg",
      canDownload: false
    },
    {
      id: 3,
      type: "bundle",
      title: "Ultimate Worship Collection",
      creator: "David Kim",
      creatorAvatar: "/placeholder.svg",
      purchaseDate: "2024-01-05",
      lastAccessed: "2024-01-19",
      price: 149000,
      status: "active",
      itemCount: 25,
      thumbnail: "/placeholder.svg",
      canDownload: true
    },
    {
      id: 4,
      type: "arrangement",
      title: "How Great Thou Art",
      artist: "Carl Boberg",
      creator: "Emma Wilson",
      creatorAvatar: "/placeholder.svg",
      purchaseDate: "2023-12-20",
      lastAccessed: "2024-01-10",
      price: 12000,
      status: "active",
      rating: 4.7,
      thumbnail: "/placeholder.svg",
      canDownload: true
    },
    {
      id: 5,
      type: "video",
      title: "Beginner Guitar for Worship",
      creator: "Lisa Garcia",
      creatorAvatar: "/placeholder.svg",
      purchaseDate: "2023-12-15",
      lastAccessed: "2023-12-25",
      price: 59000,
      status: "expired",
      duration: "1h 45m",
      progress: 100,
      expiryDate: "2024-01-15",
      thumbnail: "/placeholder.svg",
      canDownload: false
    }
  ];

  const filteredItems = libraryItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.artist && item.artist.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = activeTab === "all" || item.type === activeTab;
    const matchesCreator = filterCreator === "all" || item.creator === filterCreator;
    
    return matchesSearch && matchesType && matchesCreator;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      case "purchase-date":
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "creator":
        return a.creator.localeCompare(b.creator);
      default:
        return 0;
    }
  });

  const creators = [...new Set(libraryItems.map(item => item.creator))];

  const getItemIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "bundle":
        return <Package className="h-5 w-5" />;
      default:
        return <Music className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleItemClick = (item: any) => {
    if (item.type === "arrangement") {
      navigate(`/editor/${item.id}`);
    } else if (item.type === "video") {
      // Navigate to video player
      
    } else if (item.type === "bundle") {
      // Navigate to bundle details
      
    }
  };

  const renderGridItem = (item: any) => (
    <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
      <CardHeader className="p-4">
        <div className="relative">
          <div 
            className="aspect-video bg-gradient-worship rounded-lg flex items-center justify-center mb-3 relative overflow-hidden"
            onClick={() => handleItemClick(item)}
          >
            {getItemIcon(item.type)}
            
            {/* Progress bar for videos */}
            {item.type === "video" && item.progress && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/20">
                <div 
                  className="h-1 bg-primary transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}

            {/* Play button overlay */}
            <Button 
              size="sm" 
              variant="secondary" 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {item.type === "arrangement" ? (
                <Edit className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
          </div>
          
          {/* Status badge */}
          <Badge 
            className={`absolute -top-2 -right-2 text-xs ${getStatusColor(item.status)}`}
          >
            {item.status === "expired" ? "Expired" : "Active"}
          </Badge>
        </div>

        <div className="space-y-2">
          <div>
            <h3 className="font-semibold line-clamp-2">{item.title}</h3>
            {item.artist && (
              <p className="text-sm text-muted-foreground">{item.artist}</p>
            )}
            {item.itemCount && (
              <p className="text-xs text-muted-foreground">{item.itemCount} items</p>
            )}
            {item.duration && (
              <p className="text-xs text-muted-foreground">{item.duration}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={item.creatorAvatar} />
                <AvatarFallback>{item.creator[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{item.creator}</span>
            </div>
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{item.rating}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Purchased {new Date(item.purchaseDate).toLocaleDateString()}</span>
            {item.status === "expired" && item.expiryDate && (
              <span className="text-red-600">Expired {new Date(item.expiryDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="flex gap-2">
          {item.status === "active" ? (
            <>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleItemClick(item)}
              >
                {item.type === "arrangement" ? "Edit" : 
                 item.type === "video" ? "Watch" : "View"}
              </Button>
              {item.canDownload && (
                <Button size="sm" variant="outline">
                  <Download className="h-3 w-3" />
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="outline" className="flex-1">
              <RefreshCw className="h-3 w-3 mr-1" />
              Renew Access
            </Button>
          )}
          <Button size="sm" variant="outline">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderListItem = (item: any) => (
    <Card key={item.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-worship rounded flex items-center justify-center flex-shrink-0 relative">
            {getItemIcon(item.type)}
            {item.type === "video" && item.progress && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/20 rounded-b">
                <div 
                  className="h-1 bg-primary transition-all duration-300 rounded-b"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <h3 className="font-medium line-clamp-1">{item.title}</h3>
                {item.artist && (
                  <p className="text-sm text-muted-foreground">{item.artist}</p>
                )}
              </div>
              <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                {item.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={item.creatorAvatar} />
                  <AvatarFallback>{item.creator[0]}</AvatarFallback>
                </Avatar>
                <span>{item.creator}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Purchased {new Date(item.purchaseDate).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Last accessed {new Date(item.lastAccessed).toLocaleDateString()}</span>
              </div>
              
              {item.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{item.rating}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {item.status === "active" ? (
              <>
                <Button 
                  size="sm"
                  onClick={() => handleItemClick(item)}
                >
                  {item.type === "arrangement" ? "Edit" : 
                   item.type === "video" ? "Watch" : "View"}
                </Button>
                {item.canDownload && (
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-1" />
                Renew
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Library</h1>
              <p className="text-muted-foreground">
                Access all your purchased arrangements, videos, and bundles
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your library..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently Accessed</SelectItem>
                    <SelectItem value="purchase-date">Purchase Date</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="creator">By Creator</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCreator} onValueChange={setFilterCreator}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Creator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Creators</SelectItem>
                    {creators.map((creator) => (
                      <SelectItem key={creator} value={creator}>{creator}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Items ({libraryItems.length})</TabsTrigger>
              <TabsTrigger value="arrangement">
                Arrangements ({libraryItems.filter(item => item.type === "arrangement").length})
              </TabsTrigger>
              <TabsTrigger value="video">
                Videos ({libraryItems.filter(item => item.type === "video").length})
              </TabsTrigger>
              <TabsTrigger value="bundle">
                Bundles ({libraryItems.filter(item => item.type === "bundle").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-8">
              {sortedItems.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? "Try adjusting your search" : "Start building your library by purchasing content"}
                  </p>
                  <Button onClick={() => navigate("/marketplace")}>
                    Browse Marketplace
                  </Button>
                </div>
              ) : (
                <div className={
                  viewMode === "grid" 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
                }>
                  {sortedItems.map(item => 
                    viewMode === "grid" ? renderGridItem(item) : renderListItem(item)
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserLibrary;