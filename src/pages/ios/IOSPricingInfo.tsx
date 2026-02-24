import {
  Crown,
  Star,
  Users,
  Music,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const IOSPricingInfo = () => {
  return (
    <div className="min-h-screen bg-background pt-24 pb-32">
      <div className="container max-w-4xl mx-auto px-4 space-y-6">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Premium Plans</h1>
          <p className="text-muted-foreground mt-2">
            Compare plans and features
          </p>
        </div>

        {/* FREE */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Star className="h-6 w-6 text-primary" />
            <CardTitle>Free</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>View and use free arrangements</li>
              <li>Basic chord editor</li>
              <li>Community support</li>
            </ul>
          </CardContent>
        </Card>

        {/* BASIC */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Crown className="h-6 w-6 text-primary" />
            <CardTitle>Basic</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Everything in Free</li>
              <li>Up to 50 community songs</li>
              <li>Export arrangements to PDF</li>
            </ul>
          </CardContent>
        </Card>

        {/* PREMIUM */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Music className="h-6 w-6 text-primary" />
            <CardTitle>Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Everything in Basic</li>
              <li>Up to 100 community songs</li>
              <li>Advanced arrangement tools</li>
              <li>Unlimited music arrangements</li>
            </ul>
          </CardContent>
        </Card>

        {/* CREATOR */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>Creator Community</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Publish arrangements to community</li>
              <li>Creator profile page</li>
              <li>Priority event access</li>
            </ul>
          </CardContent>
        </Card>

        {/* Spotify-style disclaimer */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          You can’t upgrade to Premium in the app. <br />
          We know, it’s not ideal.
        </div>
      </div>
    </div>
  );
};

export default IOSPricingInfo;
