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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Flag } from "lucide-react";
import { useSongReport } from "@/hooks/useSongReport";

type ReportReason = 'inappropriate_content' | 'wrong_chords' | 'spam' | 'copyright' | 'misleading' | 'other';

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { 
    value: 'inappropriate_content', 
    label: 'Inappropriate Content', 
    description: 'Contains offensive, SARA, or inappropriate material' 
  },
  { 
    value: 'wrong_chords', 
    label: 'Wrong Chords', 
    description: 'Chords are incorrect or not matching the song' 
  },
  { 
    value: 'spam', 
    label: 'Spam / Low Quality', 
    description: 'Low effort or spam content' 
  },
  { 
    value: 'copyright', 
    label: 'Copyright Issue', 
    description: 'Violates copyright or intellectual property' 
  },
  { 
    value: 'misleading', 
    label: 'Misleading Information', 
    description: 'Title or content is misleading' 
  },
  { 
    value: 'other', 
    label: 'Other', 
    description: 'Other issues not listed above' 
  }
];

interface ReportSongModalProps {
  songId: string;
  songTitle: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportSongModal({
  songId,
  songTitle,
  userId,
  open,
  onOpenChange
}: ReportSongModalProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  
  const { hasReported, submitReport, isSubmitting } = useSongReport(songId, userId);

  const handleSubmit = () => {
    if (!reason) return;
    
    submitReport({ reason, details: details.trim() || undefined }, {
      onSuccess: () => {
        setReason('');
        setDetails('');
        onOpenChange(false);
      }
    });
  };

  const selectedReason = REPORT_REASONS.find(r => r.value === reason);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report Arrangement
          </DialogTitle>
          <DialogDescription>
            Report "{songTitle}" for violating our community guidelines.
          </DialogDescription>
        </DialogHeader>

        {hasReported ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
            <p className="text-muted-foreground">
              You have already reported this arrangement. Our team is reviewing it.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for reporting</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedReason && (
                  <p className="text-sm text-muted-foreground">
                    {selectedReason.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Additional details (optional)</Label>
                <Textarea
                  id="details"
                  placeholder="Provide more context about the issue..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {details.length}/500
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!reason || isSubmitting}
                variant="destructive"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReportSongModal;
