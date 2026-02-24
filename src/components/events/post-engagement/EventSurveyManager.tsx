import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, BarChart3, Edit } from "lucide-react";
import { SurveyQuestionEditor } from "./SurveyQuestionEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EventSurveyManagerProps {
  eventId: string;
  onUpdate?: () => void;
}

export function EventSurveyManager({ eventId, onUpdate }: EventSurveyManagerProps) {
  const { toast } = useToast();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetchSurvey();
  }, [eventId]);

  const fetchSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from("event_surveys")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      if (surveyData) {
        const { data: responsesData, error: responsesError } = await supabase
          .from("event_survey_responses")
          .select("*")
          .eq("survey_id", surveyData.id);

        if (responsesError) throw responsesError;
        setResponses(responsesData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSurvey = async () => {
    setCreating(true);
    try {
      const { error } = await supabase.from("event_surveys").insert({
        event_id: eventId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Survey created successfully",
      });

      fetchSurvey();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const updateSurveyQuestions = async () => {
    try {
      const { error } = await supabase
        .from("event_surveys")
        .update({ questions: editedQuestions })
        .eq("id", survey.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Survey questions updated successfully",
      });

      setEditDialogOpen(false);
      fetchSurvey();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = () => {
    setEditedQuestions(survey.questions || []);
    setEditDialogOpen(true);
  };

  const sendSurvey = async () => {
    if (!survey?.id) {
      toast({
        title: "Error",
        description: "Survey not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-event-survey", {
        body: { surveyId: survey.id },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data?.message || "Survey sent to all attendees",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateStats = () => {
    if (!survey || responses.length === 0) return null;

    const questions = survey.questions as any[];
    const stats: any = {};

    questions.forEach((q: any, index: number) => {
      if (q.type === "rating" || q.type === "nps") {
        const ratings = responses.map((r) => r.responses[index] || 0);
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        stats[index] = { question: q.question, average: avg.toFixed(1), type: q.type };
      }
    });

    return stats;
  };

  const stats = calculateStats();

  if (loading) {
    return <div className="text-center py-8">Loading survey...</div>;
  }

  if (!survey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Survey</CardTitle>
          <CardDescription>
            Create a feedback survey to send to attendees after the event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createSurvey} disabled={creating} className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            {creating ? "Creating..." : "Create Default Survey"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Survey Management</CardTitle>
          <CardDescription>
            Send surveys and view responses from attendees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Survey Status</p>
              <p className="text-sm text-muted-foreground">
                {responses.length} responses received
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={openEditDialog}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Questions
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Survey Questions</DialogTitle>
                    <DialogDescription>
                      Customize your survey questions and question types
                    </DialogDescription>
                  </DialogHeader>
                  <SurveyQuestionEditor
                    questions={editedQuestions}
                    onChange={setEditedQuestions}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={updateSurveyQuestions}>Save Changes</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={sendSurvey}>Send Survey</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats && Object.keys(stats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Survey Results</CardTitle>
            <CardDescription>Average ratings from attendees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.values(stats).map((stat: any, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{stat.question}</p>
                  <p className="text-sm font-bold">
                    {stat.average} / {stat.type === "nps" ? "10" : "5"}
                  </p>
                </div>
                <Progress
                  value={(parseFloat(stat.average) / (stat.type === "nps" ? 10 : 5)) * 100}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
