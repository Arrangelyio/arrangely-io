import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CreatorCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Avatar skeleton */}
          <Skeleton className="h-20 w-20 rounded-full" />

          {/* Badge skeleton */}
          <Skeleton className="h-5 w-16 rounded-full" />

          {/* Name skeleton */}
          <Skeleton className="h-5 w-24" />

          {/* Bio skeleton */}
          <div className="space-y-1 w-full">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4 mx-auto" />
          </div>

          {/* Instruments skeleton */}
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>

          {/* Stats skeleton */}
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>

          {/* Button skeleton */}
          <Skeleton className="h-9 w-full mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default CreatorCardSkeleton;
