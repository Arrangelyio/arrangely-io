import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Filter, 
  Heart, 
  Download, 
  Star,
  Music,
  Package,
  Video,
  Volume2,
  TrendingUp,
  Crown,
  ShoppingCart,
  Play
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

const Marketplace = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [priceFilter, setPriceFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");

  // Mock marketplace data
  const featuredItems = [
    {
      id: 1,
      type: "bundle",
      title: "Ultimate Worship Collection",
      creator: "David Kim",
      creatorAvatar: "/placeholder.svg",
      price: 149000,
      originalPrice: 299000,
      itemCount: 25,
      rating: 4.9,
      reviews: 87,
      downloads: 2340,
      thumbnail: "/placeholder.svg",
      featured: true,
      isPro: true
    },
    {
      id: 2,
      type: "arrangement",
      title: "10,000 Reasons (Modern Style)",
      artist: "Matt Redman", 
      creator: "Sarah Johnson",
      creatorAvatar: "/placeholder.svg",
      price: 15000,
      rating: 4.8,
      reviews: 124,
      downloads: 1567,
      thumbnail: "/placeholder.svg",
      hasVideo: true,
      hasSequencer: true,
      isPro: true
    },
    {
      id: 3,
      type: "video",
      title: "Advanced Worship Piano Techniques",
      creator: "Michael Chen",
      creatorAvatar: "/placeholder.svg",
      price: 89000,
      duration: "2h 30m",
      rating: 4.9,
      reviews: 156,
      students: 892,
      thumbnail: "/placeholder.svg",
      isPro: true
    }
  ];

  const marketplaceItems = [
    {
      id: 4,
      type: "arrangement",
      title: "How Great Thou Art",
      artist: "Carl Boberg",
      creator: "Emma Wilson",
      creatorAvatar: "/placeholder.svg",
      price: 12000,
      rating: 4.7,
      reviews: 89,
      downloads: 1203,
      genre: "Traditional",
      difficulty: "Intermediate",
      thumbnail: "/placeholder.svg"
    },
    {
      id: 5,
      type: "bundle",
      title: "Christmas Worship Bundle",
      creator: "John Martinez",
      creatorAvatar: "/placeholder.svg",
      price: 99000,
      originalPrice: 180000,
      itemCount: 15,
      rating: 4.8,
      reviews: 67,
      downloads: 543,
      genre: "Seasonal",
      thumbnail: "/placeholder.svg"
    },
    {
      id: 6,
      type: "sequencer",
      title: "Way Maker - Full Production Pack",
      creator: "Alex Thompson",
      creatorAvatar: "/placeholder.svg",
      price: 25000,
      rating: 4.6,
      reviews: 45,
      downloads: 789,
      includes: ["WAV Stems", "MIDI", "Click Track"],
      thumbnail: "/placeholder.svg"
    },
    {
      id: 7,
      type: "video",
      title: "Beginner Guitar for Worship",
      creator: "Lisa Garcia",
      creatorAvatar: "/placeholder.svg",
      price: 59000,
      duration: "1h 45m",
      rating: 4.9,
      reviews: 234,
      students: 1456,
      thumbnail: "/placeholder.svg"
    },
    {
      id: 8,
      type: "arrangement",
      title: "Amazing Grace (Contemporary)",
      artist: "John Newton",
      creator: "David Kim",
      creatorAvatar: "/placeholder.svg",
      price: 0,
      rating: 4.5,
      reviews: 312,
      downloads: 4567,
      genre: "Contemporary",
      difficulty: "Beginner",
      thumbnail: "/placeholder.svg",
      isFree: true
    }
  ];

  const filteredItems = marketplaceItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.creator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrice = priceFilter === "all" || 
                        (priceFilter === "free" && item.price === 0) ||
                        (priceFilter === "paid" && item.price > 0);
    const matchesGenre = genreFilter === "all" || item.genre === genreFilter;
    const matchesType = activeTab === "all" || item.type === activeTab;
    
    return matchesSearch && matchesPrice && matchesGenre && matchesType;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.downloads || b.students || 0) - (a.downloads || a.students || 0);
      case "rating":
        return b.rating - a.rating;
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "newest":
        return b.id - a.id;
      default:
        return 0;
    }
  });

  const renderItemCard = (item: any) => (
    <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="p-4">
        <div className="relative">
          <div className="aspect-video bg-gradient-worship rounded-lg flex items-center justify-center mb-3 relative overflow-hidden">
            {item.type === "video" ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <Video className="h-8 w-8 text-primary-foreground" />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {item.duration}
                </div>
                <Button size="sm" variant="secondary" className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-6 w-6" />
                </Button>
              </div>
            ) : item.type === "bundle" ? (
              <Package className="h-8 w-8 text-primary-foreground" />
            ) : item.type === "sequencer" ? (
              <Volume2 className="h-8 w-8 text-primary-foreground" />
            ) : (
              <Music className="h-8 w-8 text-primary-foreground" />
            )}
          </div>
          
          {item.featured && (
            <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-white">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold line-clamp-2">{item.title}</h3>
              {item.artist && (
                <p className="text-sm text-muted-foreground">{item.artist}</p>
              )}
              {item.itemCount && (
                <p className="text-xs text-muted-foreground">{item.itemCount} items included</p>
              )}
              {item.includes && (
                <p className="text-xs text-muted-foreground">{item.includes.join(", ")}</p>
              )}
            </div>
            <div className="text-right">
              {item.price === 0 ? (
                <Badge variant="secondary">Free</Badge>
              ) : (
                <div>
                  <p className="font-bold text-primary">Rp{item.price.toLocaleString()}</p>
                  {item.originalPrice && (
                    <p className="text-xs text-muted-foreground line-through">
                      Rp{item.originalPrice.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={item.creatorAvatar} />
                <AvatarFallback>{item.creator[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{item.creator}</span>
              {item.isPro && (
                <Crown className="h-3 w-3 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{item.rating}</span>
              <span className="text-xs text-muted-foreground">({item.reviews})</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {item.downloads ? `${item.downloads} downloads` : 
               item.students ? `${item.students} students` : ""}
            </span>
            {item.difficulty && (
              <Badge variant="outline" className="text-xs">
                {item.difficulty}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => navigate(`/product/${item.id}`)}
          >
            {item.type === "video" ? "Watch" : 
             item.type === "bundle" ? "View Bundle" :
             "View Details"}
          </Button>
          <Button size="sm" variant="outline">
            <Heart className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate('/checkout')}
          >
            <ShoppingCart className="h-3 w-3" />
          </Button>
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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Creator Marketplace</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover premium arrangements, video tutorials, and production packs from our community of worship creators
            </p>
          </div>

          {/* Featured Section */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Featured This Week</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredItems.map(renderItemCard)}
            </div>
          </section>

          {/* Search and Filters */}
          <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search arrangements, creators, or tutorials..."
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
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={genreFilter} onValueChange={setGenreFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    <SelectItem value="Contemporary">Contemporary</SelectItem>
                    <SelectItem value="Traditional">Traditional</SelectItem>
                    <SelectItem value="Seasonal">Seasonal</SelectItem>
                    <SelectItem value="Modern">Modern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="arrangement">Arrangements</TabsTrigger>
              <TabsTrigger value="bundle">Bundles</TabsTrigger>
              <TabsTrigger value="video">Video Tutorials</TabsTrigger>
              <TabsTrigger value="sequencer">Audio Packs</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-8">
              {sortedItems.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No items found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {sortedItems.map(renderItemCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Load More */}
          {sortedItems.length > 0 && (
            <div className="text-center">
              <Button variant="outline" size="lg">
                Load More Items
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;