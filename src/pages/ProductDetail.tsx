import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Download, 
  Heart, 
  Share2, 
  Star, 
  Music, 
  Package, 
  Video, 
  Volume2,
  Crown,
  ShoppingCart,
  Gift,
  Shield,
  CheckCircle,
  Clock,
  Users,
  Eye,
  ArrowLeft
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isInCart, setIsInCart] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock product data - in real app, fetch based on ID
  const product = {
    id: 1,
    type: "arrangement",
    title: "10,000 Reasons (Modern Style)",
    artist: "Matt Redman",
    creator: "Sarah Johnson",
    creatorId: "sarah-johnson",
    creatorAvatar: "/placeholder.svg",
    creatorRating: 4.9,
    creatorArrangements: 47,
    creatorVerified: true,
    price: 15000,
    originalPrice: 25000,
    discount: 40,
    rating: 4.8,
    reviews: 124,
    downloads: 1567,
    thumbnail: "/placeholder.svg",
    previewAudio: "/preview.mp3",
    hasVideo: true,
    hasSequencer: true,
    difficulty: "Intermediate",
    genre: "Contemporary",
    key: "D Major",
    tempo: 74,
    duration: "4:32",
    tags: ["worship", "acoustic", "live", "contemporary", "piano"],
    description: "A beautiful modern arrangement of Matt Redman's beloved worship song. This arrangement features contemporary chord progressions and dynamic builds perfect for live worship settings.",
    structure: ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus x2", "Outro"],
    includes: [
      "Full chord chart with lyrics",
      "Lead sheet notation",
      "Audio backing track",
      "Click track",
      "Nashville number system chart"
    ],
    requirements: "Basic to intermediate piano/guitar skills",
    useCase: "Perfect for Sunday morning worship, youth services, and acoustic sets",
    license: "Church performance license included",
    watermark: true,
    maxDevices: 2,
    accessType: "lifetime"
  };

  const relatedProducts = [
    {
      id: 2,
      type: "arrangement",
      title: "Goodness of God",
      creator: "Sarah Johnson",
      price: 12000,
      rating: 4.7,
      downloads: 892,
      thumbnail: "/placeholder.svg"
    },
    {
      id: 3,
      type: "video",
      title: "Modern Worship Piano Course",
      creator: "Sarah Johnson", 
      price: 89000,
      rating: 4.9,
      students: 456,
      thumbnail: "/placeholder.svg"
    },
    {
      id: 4,
      type: "bundle",
      title: "Contemporary Worship Bundle",
      creator: "David Kim",
      price: 149000,
      originalPrice: 220000,
      rating: 4.8,
      itemCount: 15,
      thumbnail: "/placeholder.svg"
    }
  ];

  const reviews = [
    {
      id: 1,
      user: "Michael Chen",
      avatar: "/placeholder.svg",
      rating: 5,
      date: "2 weeks ago",
      comment: "Absolutely beautiful arrangement! Used it for our Sunday service and the congregation loved it. The chord progressions are modern yet accessible.",
      verified: true
    },
    {
      id: 2,
      user: "Lisa Garcia",
      avatar: "/placeholder.svg", 
      rating: 4,
      date: "1 month ago",
      comment: "Great arrangement with clear notation. The backing track really helps during practice. Would love to see more songs in this style!",
      verified: true
    },
    {
      id: 3,
      user: "John Martinez",
      avatar: "/placeholder.svg",
      rating: 5,
      date: "2 months ago",
      comment: "Perfect for our acoustic worship set. The simplified chord chart makes it easy for our volunteers to follow along.",
      verified: false
    }
  ];

  const handleAddToCart = () => {
    setIsInCart(!isInCart);
    if (!isInCart) {
      // Add to cart logic
      
    }
  };

  const handleBuyNow = () => {
    navigate("/checkout", { state: { items: [product] } });
  };

  const handlePreview = () => {
    setIsPlaying(!isPlaying);
    // Handle audio preview logic
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Media Preview */}
                    <div>
                      <div className="aspect-video bg-gradient-worship rounded-lg flex items-center justify-center relative overflow-hidden mb-4">
                        <Music className="h-12 w-12 text-primary-foreground" />
                        {product.watermark && (
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Preview
                          </div>
                        )}
                        <Button 
                          size="lg" 
                          className="absolute inset-0 opacity-80 hover:opacity-100 transition-opacity"
                          onClick={handlePreview}
                        >
                          {isPlaying ? (
                            <>
                              <Volume2 className="h-8 w-8 mr-2" />
                              Playing...
                            </>
                          ) : (
                            <>
                              <Play className="h-8 w-8 mr-2" />
                              Preview (10s)
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-sm font-medium">{product.downloads}</div>
                          <div className="text-xs text-muted-foreground">Downloads</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <Star className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                          <div className="text-sm font-medium">{product.rating}</div>
                          <div className="text-xs text-muted-foreground">{product.reviews} Reviews</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <div className="text-sm font-medium">{product.duration}</div>
                          <div className="text-xs text-muted-foreground">Duration</div>
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-4">
                      <div>
                        <Badge className="mb-2">{product.type}</Badge>
                        <h1 className="text-2xl font-bold mb-1">{product.title}</h1>
                        <p className="text-muted-foreground mb-2">by {product.artist}</p>
                        
                        {/* Creator Info */}
                        <div className="flex items-center gap-2 mb-4">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={product.creatorAvatar} />
                            <AvatarFallback>{product.creator[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">{product.creator}</span>
                              {product.creatorVerified && (
                                <Crown className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {product.creatorArrangements} arrangements • {product.creatorRating}★
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Key Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Difficulty:</span>
                          <span className="ml-2 font-medium">{product.difficulty}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Genre:</span>
                          <span className="ml-2 font-medium">{product.genre}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Key:</span>
                          <span className="ml-2 font-medium">{product.key}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tempo:</span>
                          <span className="ml-2 font-medium">{product.tempo} BPM</span>
                        </div>
                      </div>

                      {/* Access Info */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Access Details</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>• {product.accessType} access</div>
                          <div>• Max {product.maxDevices} devices</div>
                          <div>• Church performance license included</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs Section */}
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="structure">Structure</TabsTrigger>
                  <TabsTrigger value="includes">What's Included</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-3">About This Arrangement</h3>
                      <p className="text-muted-foreground mb-4">{product.description}</p>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="font-medium">Best for:</span>
                          <span className="ml-2 text-muted-foreground">{product.useCase}</span>
                        </div>
                        <div>
                          <span className="font-medium">Requirements:</span>
                          <span className="ml-2 text-muted-foreground">{product.requirements}</span>
                        </div>
                        <div>
                          <span className="font-medium">License:</span>
                          <span className="ml-2 text-muted-foreground">{product.license}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="structure" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-3">Song Structure</h3>
                      <div className="space-y-2">
                        {product.structure.map((section, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-muted/20 rounded">
                            <span className="text-sm font-mono font-medium w-6">{index + 1}</span>
                            <span>{section}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="includes" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-3">Package Contents</h3>
                      <div className="space-y-2">
                        {product.includes.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold">Customer Reviews</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{product.rating}</span>
                          </div>
                          <span className="text-muted-foreground">({product.reviews} reviews)</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div key={review.id} className="border-b pb-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={review.avatar} />
                                  <AvatarFallback>{review.user[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-sm">{review.user}</span>
                                    {review.verified && (
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star 
                                        key={i} 
                                        className={`h-3 w-3 ${
                                          i < review.rating 
                                            ? "fill-yellow-400 text-yellow-400" 
                                            : "text-muted-foreground"
                                        }`} 
                                      />
                                    ))}
                                    <span className="text-xs text-muted-foreground ml-1">{review.date}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Purchase Card */}
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-primary">
                        Rp{product.price.toLocaleString()}
                      </span>
                      {product.originalPrice && (
                        <span className="text-lg text-muted-foreground line-through">
                          Rp{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {product.discount && (
                      <Badge className="bg-green-600 text-white">
                        {product.discount}% OFF
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={handleBuyNow}
                    >
                      Buy Now
                    </Button>
                    
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="w-full"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {isInCart ? "Remove from Cart" : "Add to Cart"}
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsFavorited(!isFavorited)}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
                        Save
                      </Button>
                      <Button variant="outline" size="sm">
                        <Gift className="h-4 w-4 mr-1" />
                        Gift
                      </Button>
                    </div>

                    <Button variant="ghost" size="sm" className="w-full">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Creator Profile */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">About the Creator</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={product.creatorAvatar} />
                      <AvatarFallback>{product.creator[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{product.creator}</span>
                        {product.creatorVerified && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {product.creatorArrangements} arrangements
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-4">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{product.creatorRating}</span>
                    <span className="text-muted-foreground text-sm">creator rating</span>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate(`/creator/${product.creatorId}`)}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Related Products */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">You might also like</h3>
                  <div className="space-y-4">
                    {relatedProducts.map((item) => (
                      <div key={item.id} className="flex gap-3 cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors">
                        <div className="w-16 h-16 bg-gradient-worship rounded flex items-center justify-center flex-shrink-0">
                          {item.type === "video" ? (
                            <Video className="h-4 w-4 text-primary-foreground" />
                          ) : item.type === "bundle" ? (
                            <Package className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <Music className="h-4 w-4 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                          <p className="text-xs text-muted-foreground">{item.creator}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-medium text-primary">
                              Rp{item.price.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{item.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;