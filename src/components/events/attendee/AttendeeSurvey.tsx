import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2 } from "lucide-react";

interface AttendeeSurveyProps {
  eventId: string;
  registrationId: string;
}

export function AttendeeSurvey({ eventId, registrationId }: AttendeeSurveyProps) {
  const { toast } = useToast();
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [responses, setResponses] = useState<any>({});

  useEffect(() => {
    fetchSurvey();
  }, [eventId, registrationId]);

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
        const { data: responseData, error: responseError } = await supabase
          .from("event_survey_responses")
          .select("*")
          .eq("survey_id", surveyData.id)
          .eq("registration_id", registrationId)
          .maybeSingle();

        if (responseError && responseError.code !== "PGRST116") throw responseError;
        if (responseData) {
          setCompleted(true);
        }
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

  const handleSubmit = async () => {
    if (!survey?.id) return;

    setSubmitting(true);
    try {
      const questions = survey.questions as any[];
      const answersArray = questions.map((_, index) => responses[index] || "");

      const { error } = await supabase.from("event_survey_responses").insert({
        survey_id: survey.id,
        registration_id: registrationId,
        responses: answersArray,
      });

      if (error) throw error;

      // Update registration survey_completed_at
      await supabase
        .from("event_registrations")
        .update({ survey_completed_at: new Date().toISOString() })
        .eq("id", registrationId);

      toast({
        title: "Success",
        description: "Thank you for your feedback!",
      });
      setCompleted(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading survey...</div>;
  }

  if (!survey) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No survey available yet</p>
        </CardContent>
      </Card>
    );
  }

  if (completed) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Survey Completed</h3>
          <p className="text-muted-foreground">Thank you for your feedback!</p>
        </CardContent>
      </Card>
    );
  }

  const questions = survey.questions as any[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{survey.title}</CardTitle>
        <CardDescription>Please share your feedback about the event</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question: any, index: number) => (
          <div key={index} className="space-y-3">
            <Label className="text-base">{question.question}</Label>

            {question.type === "rating" && (
              <RadioGroup
                value={responses[index] || ""}
                onValueChange={(value) =>
                  setResponses({ ...responses, [index]: value })
                }
              >
                <div className="flex gap-4">
                  {Array.from({ length: question.scale || 5 }, (_, i) => i + 1).map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(value)} id={`q${index}-${value}`} />
                      <Label htmlFor={`q${index}-${value}`} className="cursor-pointer">
                        {value}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {question.type === "nps" && (
              <RadioGroup
                value={responses[index] || ""}
                onValueChange={(value) =>
                  setResponses({ ...responses, [index]: value })
                }
              >
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 11 }, (_, i) => i).map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(value)} id={`q${index}-${value}`} />
                      <Label htmlFor={`q${index}-${value}`} className="cursor-pointer">
                        {value}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {question.type === "text" && (
              <Textarea
                value={responses[index] || ""}
                onChange={(e) =>
                  setResponses({ ...responses, [index]: e.target.value })
                }
                placeholder="Your answer..."
                rows={4}
              />
            )}

            {question.type === "multiple_choice" && (
              <RadioGroup
                value={responses[index] || ""}
                onValueChange={(value) =>
                  setResponses({ ...responses, [index]: value })
                }
              >
                {question.options?.map((option: string, optIndex: number) => (
                  <div key={optIndex} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`q${index}-opt${optIndex}`} />
                    <Label htmlFor={`q${index}-opt${optIndex}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        ))}

        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? "Submitting..." : "Submit Survey"}
        </Button>
      </CardContent>
    </Card>
  );
}
