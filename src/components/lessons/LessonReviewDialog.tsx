import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LessonReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  userId: string;
  onSubmitSuccess?: () => void;
}

export function LessonReviewDialog({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  userId,
  onSubmitSuccess,
}: LessonReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const queryClient = useQueryClient();

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error("Please select a rating");

      const { error } = await supabase.from("lesson_reviews").insert({
        lesson_id: lessonId,
        user_id: userId,
        rating,
        review_text: reviewText.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["lesson-review"] });
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      toast.success("Thank you for your review!");
      onOpenChange(false);
      setRating(0);
      setReviewText("");
      onSubmitSuccess?.();
    },
    onError: (error: any) => {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Rate this Lesson</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your experience with "{lessonTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium">How would you rate this lesson?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 5 && "Excellent! 🎉"}
                {rating === 4 && "Great! 👍"}
                {rating === 3 && "Good 👌"}
                {rating === 2 && "Fair 😐"}
                {rating === 1 && "Needs improvement 😕"}
              </p>
            )}
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Share your thoughts (optional)
            </label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="What did you like about this lesson? What could be improved?"
              className="min-h-[100px] rounded-xl resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reviewText.length}/500
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={() => submitReviewMutation.mutate()}
            disabled={rating === 0 || submitReviewMutation.isPending}
            className="w-full rounded-xl py-5 text-base font-semibold"
          >
            {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
