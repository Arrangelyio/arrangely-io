import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, Save, Eye, Edit, Trash2, Plus, Minus, 
  BarChart3, TrendingUp, Users, Download 
} from "lucide-react";

interface Arrangement {
  id: number;
  title: string;
  artist: string;
  type: "premium" | "free";
  price?: string;
  downloads: number;
}

interface BundleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle?: {
    id: number;
    title: string;
    description: string;
    price: string;
    songs: string[];
    sales: number;
    revenue: string;
    status: "published" | "draft";
  } | null;
  availableArrangements: Arrangement[];
}

const BundleDetailsModal = ({ 
  open, 
  onOpenChange, 
  bundle, 
  availableArrangements 
}: BundleDetailsModalProps) => {
  const isEdit = !!bundle;
  const [formData, setFormData] = useState({
    title: bundle?.title || "",
    description: bundle?.description || "",
    price: bundle?.price || "",
    selectedArrangements: [] as number[],
    status: bundle?.status || "draft" as "draft" | "published"
  });

  const [activeTab, setActiveTab] = useState("details");

  // Mock analytics data
  const analyticsData = {
    totalViews: 1250,
    conversionRate: "3.2%",
    avgRating: 4.8,
    recentSales: [
      { date: "2024-01-15", amount: "Rp35.000", customer: "John D." },
      { date: "2024-01-14", amount: "Rp35.000", customer: "Sarah M." },
      { date: "2024-01-13", amount: "Rp35.000", customer: "Mike L." },
    ],
    monthlyRevenue: [
      { month: "Oct", revenue: 180000 },
      { month: "Nov", revenue: 220000 },
      { month: "Dec", revenue: 350000 },
      { month: "Jan", revenue: 280000 },
    ]
  };

  const handleArrangementToggle = (arrangementId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedArrangements: prev.selectedArrangements.includes(arrangementId)
        ? prev.selectedArrangements.filter(id => id !== arrangementId)
        : [...prev.selectedArrangements, arrangementId]
    }));
  };

  const calculateBundleValue = () => {
    const selectedItems = availableArrangements.filter(arr => 
      formData.selectedArrangements.includes(arr.id) && arr.type === "premium"
    );
    return selectedItems.reduce((total, item) => {
      return total + (parseInt(item.price || "0"));
    }, 0);
  };

  const suggestedDiscount = Math.round(calculateBundleValue() * 0.8); // 20% discount

  const handleSave = (status: "draft" | "published") => {
    const bundleData = {
      ...formData,
      status,
      selectedArrangements: formData.selectedArrangements
    };
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEdit ? "Edit Bundle" : "Create New Bundle"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Bundle Details</TabsTrigger>
            <TabsTrigger value="arrangements">Select Songs</TabsTrigger>
            {isEdit && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bundle-title">Bundle Title *</Label>
                  <Input
                    id="bundle-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Christmas Worship Collection"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bundle-price">Bundle Price (Rp) *</Label>
                  <Select 
                    value={formData.price} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, price: value }))}
                  >
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
                  {calculateBundleValue() > 0 && (
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        Individual items total: Rp{calculateBundleValue().toLocaleString()}
                      </p>
                      <p className="text-green-600">
                        Suggested bundle price: Rp{suggestedDiscount.toLocaleString()} (20% discount)
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bundle-description">Description *</Label>
                  <Textarea
                    id="bundle-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your bundle, what makes it special, and what users will get..."
                    rows={6}
                  />
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Bundle Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">{formData.title || "Bundle Title"}</h3>
                    <Badge className="mt-1 bg-gradient-to-r from-amber-500 to-orange-500">
                      {formData.price ? `Rp${parseInt(formData.price).toLocaleString()}` : "Price not set"}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {formData.description || "Bundle description will appear here..."}
                  </p>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Includes {formData.selectedArrangements.length} arrangements:
                    </Label>
                    {formData.selectedArrangements.length > 0 ? (
                      <ul className="text-xs space-y-1">
                        {formData.selectedArrangements.slice(0, 5).map(id => {
                          const arrangement = availableArrangements.find(arr => arr.id === id);
                          return arrangement ? (
                            <li key={id} className="flex items-center gap-2">
                              <span>•</span>
                              <span>{arrangement.title} - {arrangement.artist}</span>
                              {arrangement.type === "premium" && (
                                <Badge variant="outline" className="text-xs">
                                  Rp{arrangement.price}
                                </Badge>
                              )}
                            </li>
                          ) : null;
                        })}
                        {formData.selectedArrangements.length > 5 && (
                          <li className="text-muted-foreground">
                            +{formData.selectedArrangements.length - 5} more songs
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No arrangements selected</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="arrangements" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Arrangements for Bundle</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which arrangements to include in this bundle. Selected: {formData.selectedArrangements.length}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {availableArrangements.map((arrangement) => (
                  <Card 
                    key={arrangement.id} 
                    className={`cursor-pointer transition-all ${
                      formData.selectedArrangements.includes(arrangement.id) 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : "hover:shadow-md"
                    }`}
                    onClick={() => handleArrangementToggle(arrangement.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          checked={formData.selectedArrangements.includes(arrangement.id)}
                          onChange={() => handleArrangementToggle(arrangement.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm">{arrangement.title}</h4>
                              <p className="text-xs text-muted-foreground">{arrangement.artist}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {arrangement.type === "premium" ? (
                                <Badge variant="secondary" className="text-xs">
                                  Rp{arrangement.price}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Free</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {arrangement.downloads} downloads
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {formData.selectedArrangements.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Bundle Summary</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.selectedArrangements.length} arrangements selected
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Individual value:</p>
                        <p className="font-bold">Rp{calculateBundleValue().toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {isEdit && (
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold">{bundle?.sales || 0}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">{bundle?.revenue || "Rp0"}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Views</p>
                        <p className="text-2xl font-bold">{analyticsData.totalViews}</p>
                      </div>
                      <Eye className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Conversion</p>
                        <p className="text-2xl font-bold">{analyticsData.conversionRate}</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analyticsData.recentSales.map((sale, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-sm">{sale.date}</TableCell>
                            <TableCell className="text-sm">{sale.customer}</TableCell>
                            <TableCell className="text-sm font-medium text-green-600">
                              {sale.amount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Bundle Optimization
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        Consider adding more seasonal songs to increase appeal
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Pricing Strategy
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-300">
                        Your 20% discount is attracting more customers
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Marketing Opportunity
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-300">
                        Share this bundle on social media for more exposure
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => handleSave("draft")}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button 
              onClick={() => handleSave("published")}
              className="bg-gradient-worship hover:opacity-90"
            >
              {isEdit ? "Update Bundle" : "Create Bundle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BundleDetailsModal;