import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, GripVertical } from "lucide-react";

interface Question {
  type: "rating" | "nps" | "text" | "multiple_choice";
  question: string;
  scale?: number;
  options?: string[];
}

interface SurveyQuestionEditorProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

export function SurveyQuestionEditor({ questions, onChange }: SurveyQuestionEditorProps) {
  const [editingQuestions, setEditingQuestions] = useState<Question[]>(questions);

  const addQuestion = () => {
    const newQuestion: Question = {
      type: "rating",
      question: "",
      scale: 5,
    };
    const updated = [...editingQuestions, newQuestion];
    setEditingQuestions(updated);
    onChange(updated);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = editingQuestions.map((q, i) =>
      i === index ? { ...q, ...updates } : q
    );
    setEditingQuestions(updated);
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = editingQuestions.filter((_, i) => i !== index);
    setEditingQuestions(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {editingQuestions.map((question, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value: any) =>
                      updateQuestion(index, { type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Rating Scale</SelectItem>
                      <SelectItem value="nps">NPS (0-10)</SelectItem>
                      <SelectItem value="text">Text Response</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input
                    value={question.question}
                    onChange={(e) =>
                      updateQuestion(index, { question: e.target.value })
                    }
                    placeholder="Enter your question"
                  />
                </div>

                {question.type === "rating" && (
                  <div className="space-y-2">
                    <Label>Scale (1 to...)</Label>
                    <Select
                      value={String(question.scale || 5)}
                      onValueChange={(value) =>
                        updateQuestion(index, { scale: Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="7">7</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {question.type === "multiple_choice" && (
                  <div className="space-y-2">
                    <Label>Options (one per line)</Label>
                    <textarea
                      className="w-full min-h-[100px] p-2 border rounded-md"
                      value={question.options?.join("\n") || ""}
                      onChange={(e) =>
                        updateQuestion(index, {
                          options: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeQuestion(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={addQuestion} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
}
