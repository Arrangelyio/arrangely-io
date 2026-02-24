import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Loader2, 
  XCircle, 
  Clock,
  Youtube,
  Music2,
  FileMusic,
  ShieldCheck
} from "lucide-react";
import { usePublishSong, usePublicationValidation } from "@/hooks/usePublishSong";
import { useCreatorProStatus } from "@/hooks/useCreatorProStatus";
import { cn } from "@/lib/utils";

interface PublishSongModalProps {
  songId: string;
  songTitle: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const VALIDATION_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  youtube: { label: 'YouTube Link', icon: Youtube },
  sections: { label: 'Song Sections', icon: Music2 },
  chords: { label: 'Chord Validation', icon: FileMusic },
  content: { label: 'Content Moderation', icon: ShieldCheck }
};

export function PublishSongModal({
  songId,
  songTitle,
  userId,
  open,
  onOpenChange,
  onSuccess
}: PublishSongModalProps) {
  const [publicationId, setPublicationId] = useState<string | null>(null);
  
  const { data: proStatus } = useCreatorProStatus(userId);
  const { publishSong, isPublishing } = usePublishSong(userId);
  const { data: validations } = usePublicationValidation(publicationId || undefined);

  const handlePublish = () => {
    publishSong({ songId }, {
      onSuccess: (data) => {
        setPublicationId(data.id);
      }
    });
  };

  const handleClose = () => {
    setPublicationId(null);
    onOpenChange(false);
    if (validations?.every(v => v.status === 'passed')) {
      onSuccess?.();
    }
  };

  const isValidating = publicationId && validations?.some(v => v.status === 'pending' || v.status === 'in_progress');
  const allPassed = validations?.every(v => v.status === 'passed');
  const hasFailed = validations?.some(v => v.status === 'failed');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Check if user can publish
  if (!proStatus?.canPublish) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Publish</DialogTitle>
            <DialogDescription>
              {proStatus?.score?.status === 'blocked' && (
                <span className="text-amber-500">
                  Your publishing is temporarily blocked due to low quality score. 
                  Improve your score to resume publishing.
                </span>
              )}
              {proStatus?.score?.status === 'suspended' && (
                <span className="text-destructive">
                  Your account is suspended. Please contact support.
                </span>
              )}
              {!proStatus?.hasActiveSubscription && !proStatus?.isInGracePeriod && (
                <span>
                  You need an active Creator Community subscription to publish.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publish to Marketplace</DialogTitle>
          <DialogDescription>
            Publish "{songTitle}" to the Community Library marketplace.
          </DialogDescription>
        </DialogHeader>

        {!publicationId ? (
          <>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Your arrangement will go through automated quality checks:
              </p>
              <ul className="space-y-2 text-sm">
                {Object.entries(VALIDATION_LABELS).map(([key, { label, icon: Icon }]) => (
                  <li key={key} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                If all checks pass, your arrangement will be published immediately. 
                Otherwise, it may require manual review.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={isPublishing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Publish Now'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <div className="space-y-3">
                {validations?.map((v) => {
                  const config = VALIDATION_LABELS[v.type];
                  const Icon = config?.icon || ShieldCheck;
                  
                  return (
                    <div 
                      key={v.type}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        v.status === 'passed' && "bg-emerald-500/10 border-emerald-500/20",
                        v.status === 'failed' && "bg-destructive/10 border-destructive/20",
                        (v.status === 'pending' || v.status === 'in_progress') && "bg-muted/50 border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{config?.label || v.type}</span>
                      </div>
                      {getStatusIcon(v.status)}
                    </div>
                  );
                })}
              </div>

              {allPassed && (
                <div className="p-4 bg-emerald-500/10 rounded-lg text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium text-emerald-500">All checks passed!</p>
                  <p className="text-sm text-muted-foreground">
                    Your arrangement is now live on the marketplace.
                  </p>
                </div>
              )}

              {hasFailed && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <p className="font-medium text-destructive mb-2">Some checks failed</p>
                  <p className="text-sm text-muted-foreground">
                    Please review the failed checks and fix the issues before trying again.
                  </p>
                  {validations?.filter(v => v.status === 'failed').map(v => (
                    <p key={v.type} className="text-xs text-destructive mt-2">
                      {v.errorMessage || `${VALIDATION_LABELS[v.type]?.label} check failed`}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                onClick={handleClose}
                disabled={isValidating}
              >
                {isValidating ? 'Validating...' : 'Close'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PublishSongModal;
