import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExerciseData {
  exercise_type: 'chord_chart' | 'rhythm_trainer' | 'ear_training' | 'quiz' | 'performance_task';
  exercise_data: any;
  difficulty: number;
  completion_criteria: {
    min_accuracy: number;
  };
}

interface ExerciseBuilderProps {
  onSave: (data: ExerciseData) => void;
  initialData?: ExerciseData;
  category?: string;
  tier?: string;
  subcategory?: string;
}

export default function ExerciseBuilder({ onSave, initialData, category, tier, subcategory }: ExerciseBuilderProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [exerciseData, setExerciseData] = useState<ExerciseData>(
    initialData || {
      exercise_type: "quiz",
      difficulty: 1,
      completion_criteria: { min_accuracy: 70 },
      exercise_data: {
        questions: [{ question: "", type: "multiple_choice", options: ["", "", "", ""], correct_answer: "" }]
      }
    }
  );

  // Initialize appropriate data structure when exercise type changes
  const handleExerciseTypeChange = (type: string) => {
    const newType = type as ExerciseData['exercise_type'];
    let newExerciseData: any = {};

    switch (newType) {
      case 'chord_chart':
        newExerciseData = {
          tempo: 90,
          chords: [
            { name: "C", position: 1, duration: 4 }
          ]
        };
        break;
      case 'rhythm_trainer':
        newExerciseData = {
          tempo: 100,
          time_signature: "4/4",
          measures: 4,
          pattern: [1, 0, 1, 0, 1, 0, 1, 0]
        };
        break;
      case 'ear_training':
        newExerciseData = {
          exercise_description: "",
          audio_samples: []
        };
        break;
      case 'performance_task':
        newExerciseData = {
          task_description: "",
          requirements: [],
          rubric_items: []
        };
        break;
      case 'quiz':
      default:
        newExerciseData = {
          questions: [{ question: "", type: "multiple_choice", options: ["", "", "", ""], correct_answer: "" }]
        };
        break;
    }

    setExerciseData({
      ...exerciseData,
      exercise_type: newType,
      exercise_data: newExerciseData
    });
  };

  // Generate AI questions
  const generateQuestions = async () => {
    if (!category || !tier) {
      toast({
        title: "Missing Information",
        description: "Please ensure the music lab has a category and difficulty level set.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz-questions', {
        body: { 
          category, 
          tier,
          count: 5,
          subcategory
        }
      });

      if (error) throw error;

      if (data?.questions) {
        setExerciseData({
          ...exerciseData,
          exercise_data: {
            ...exerciseData.exercise_data,
            questions: data.questions
          }
        });
        toast({
          title: "Questions Generated!",
          description: `Generated ${data.questions.length} professional questions for ${category} (${tier} level)`,
        });
      }
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate questions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Quiz-specific functions
  const addQuestion = () => {
    setExerciseData({
      ...exerciseData,
      exercise_data: {
        ...exerciseData.exercise_data,
        questions: [
          ...(exerciseData.exercise_data.questions || []),
          { question: "", type: "multiple_choice", options: ["", "", "", ""], correct_answer: "" }
        ]
      }
    });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...(exerciseData.exercise_data.questions || [])];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setExerciseData({ 
      ...exerciseData, 
      exercise_data: { ...exerciseData.exercise_data, questions: newQuestions }
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...(exerciseData.exercise_data.questions || [])];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options![optionIndex] = value;
      setExerciseData({ 
        ...exerciseData, 
        exercise_data: { ...exerciseData.exercise_data, questions: newQuestions }
      });
    }
  };

  const removeQuestion = (index: number) => {
    setExerciseData({
      ...exerciseData,
      exercise_data: {
        ...exerciseData.exercise_data,
        questions: (exerciseData.exercise_data.questions || []).filter((_, i) => i !== index)
      }
    });
  };

  // Chord Chart functions
  const addChord = () => {
    const chords = exerciseData.exercise_data.chords || [];
    setExerciseData({
      ...exerciseData,
      exercise_data: {
        ...exerciseData.exercise_data,
        chords: [...chords, { name: "C", position: chords.length + 1, duration: 4 }]
      }
    });
  };

  const updateChord = (index: number, field: string, value: any) => {
    const newChords = [...(exerciseData.exercise_data.chords || [])];
    newChords[index] = { ...newChords[index], [field]: value };
    setExerciseData({
      ...exerciseData,
      exercise_data: { ...exerciseData.exercise_data, chords: newChords }
    });
  };

  const removeChord = (index: number) => {
    setExerciseData({
      ...exerciseData,
      exercise_data: {
        ...exerciseData.exercise_data,
        chords: (exerciseData.exercise_data.chords || []).filter((_, i) => i !== index)
      }
    });
  };

  // Performance Task functions
  const addRequirement = () => {
    const requirements = exerciseData.exercise_data.requirements || [];
    setExerciseData({
      ...exerciseData,
      exercise_data: {
        ...exerciseData.exercise_data,
        requirements: [...requirements, ""]
      }
    });
  };

  const updateRequirement = (index: number, value: string) => {
    const newRequirements = [...(exerciseData.exercise_data.requirements || [])];
    newRequirements[index] = value;
    setExerciseData({
      ...exerciseData,
      exercise_data: { ...exerciseData.exercise_data, requirements: newRequirements }
    });
  };

  const removeRequirement = (index: number) => {
    setExerciseData({
      ...exerciseData,
      exercise_data: {
        ...exerciseData.exercise_data,
        requirements: (exerciseData.exercise_data.requirements || []).filter((_, i) => i !== index)
      }
    });
  };

  const validateExercise = () => {
    if (!exerciseData.exercise_type) return false;

    switch (exerciseData.exercise_type) {
      case 'quiz':
        return (exerciseData.exercise_data.questions || []).length > 0 &&
               (exerciseData.exercise_data.questions || []).every((q: any) => q.question.trim());
      case 'chord_chart':
        return (exerciseData.exercise_data.chords || []).length > 0 &&
               exerciseData.exercise_data.tempo > 0;
      case 'rhythm_trainer':
        return (exerciseData.exercise_data.pattern || []).length > 0 &&
               exerciseData.exercise_data.tempo > 0;
      case 'performance_task':
        return exerciseData.exercise_data.task_description?.trim();
      case 'ear_training':
        return exerciseData.exercise_data.exercise_description?.trim();
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Exercise Type</Label>
          <Select
            value={exerciseData.exercise_type}
            onValueChange={handleExerciseTypeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="performance_task">Performance Task</SelectItem>
              <SelectItem value="ear_training">Ear Training</SelectItem>
              <SelectItem value="rhythm_trainer">Rhythm Trainer</SelectItem>
              <SelectItem value="chord_chart">Chord Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Difficulty (1-5)</Label>
          <Input
            type="number"
            min="1"
            max="5"
            value={exerciseData.difficulty}
            onChange={(e) => setExerciseData({ ...exerciseData, difficulty: parseInt(e.target.value) || 1 })}
          />
        </div>

        <div>
          <Label>Minimum Accuracy (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={exerciseData.completion_criteria.min_accuracy}
            onChange={(e) => setExerciseData({ 
              ...exerciseData, 
              completion_criteria: { min_accuracy: parseInt(e.target.value) || 70 }
            })}
          />
        </div>
      </div>

      {/* Quiz Fields */}
      {exerciseData.exercise_type === 'quiz' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Questions</h3>
            <div className="flex gap-2">
              <Button 
                type="button" 
                onClick={generateQuestions} 
                size="sm" 
                variant="default"
                disabled={isGenerating || !category || !tier}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
              <Button onClick={addQuestion} size="sm" type="button" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          {(exerciseData.exercise_data.questions || []).map((question: any, qIndex: number) => (
            <div key={qIndex} className="space-y-4 p-4 border rounded-lg bg-card">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label>Question {qIndex + 1}</Label>
                    <Textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                      placeholder="Enter your question"
                    />
                  </div>

                  <div>
                    <Label>Question Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) => updateQuestion(qIndex, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {question.type === "multiple_choice" && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {question.options?.map((option: string, oIndex: number) => (
                        <Input
                          key={oIndex}
                          value={option}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  <div>
                    <Label>Correct Answer</Label>
                    <Input
                      value={question.correct_answer}
                      onChange={(e) => updateQuestion(qIndex, "correct_answer", e.target.value)}
                      placeholder="Enter the correct answer"
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(qIndex)}
                  type="button"
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chord Chart Fields */}
      {exerciseData.exercise_type === 'chord_chart' && (
        <div className="space-y-4">
          <div>
            <Label>Tempo (BPM)</Label>
            <Input
              type="number"
              min="40"
              max="200"
              value={exerciseData.exercise_data.tempo || 90}
              onChange={(e) => setExerciseData({
                ...exerciseData,
                exercise_data: { ...exerciseData.exercise_data, tempo: parseInt(e.target.value) || 90 }
              })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Chord Progression</h3>
              <Button onClick={addChord} size="sm" type="button">
                <Plus className="h-4 w-4 mr-2" />
                Add Chord
              </Button>
            </div>

            {(exerciseData.exercise_data.chords || []).map((chord: any, index: number) => (
              <div key={index} className="flex items-end gap-2 p-4 border rounded-lg bg-card">
                <div className="flex-1">
                  <Label>Chord Name</Label>
                  <Input
                    value={chord.name}
                    onChange={(e) => updateChord(index, "name", e.target.value)}
                    placeholder="e.g., C, Am, G7"
                  />
                </div>
                <div className="w-24">
                  <Label>Duration</Label>
                  <Input
                    type="number"
                    min="1"
                    max="16"
                    value={chord.duration}
                    onChange={(e) => updateChord(index, "duration", parseInt(e.target.value) || 4)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChord(index)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rhythm Trainer Fields */}
      {exerciseData.exercise_type === 'rhythm_trainer' && (
        <div className="space-y-4">
          <div>
            <Label>Tempo (BPM)</Label>
            <Input
              type="number"
              min="40"
              max="200"
              value={exerciseData.exercise_data.tempo || 100}
              onChange={(e) => setExerciseData({
                ...exerciseData,
                exercise_data: { ...exerciseData.exercise_data, tempo: parseInt(e.target.value) || 100 }
              })}
            />
          </div>

          <div>
            <Label>Time Signature</Label>
            <Select
              value={exerciseData.exercise_data.time_signature || "4/4"}
              onValueChange={(value) => setExerciseData({
                ...exerciseData,
                exercise_data: { ...exerciseData.exercise_data, time_signature: value }
              })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="4/4">4/4</SelectItem>
                <SelectItem value="3/4">3/4</SelectItem>
                <SelectItem value="6/8">6/8</SelectItem>
                <SelectItem value="2/4">2/4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Number of Measures</Label>
            <Input
              type="number"
              min="1"
              max="16"
              value={exerciseData.exercise_data.measures || 4}
              onChange={(e) => setExerciseData({
                ...exerciseData,
                exercise_data: { ...exerciseData.exercise_data, measures: parseInt(e.target.value) || 4 }
              })}
            />
          </div>

          <div>
            <Label>Pattern (comma-separated 0s and 1s, e.g., 1,0,1,0,1,0,1,0)</Label>
            <Input
              value={(exerciseData.exercise_data.pattern || []).join(',')}
              onChange={(e) => {
                const pattern = e.target.value.split(',').map(v => parseInt(v.trim()) || 0).filter(v => v === 0 || v === 1);
                setExerciseData({
                  ...exerciseData,
                  exercise_data: { ...exerciseData.exercise_data, pattern }
                });
              }}
              placeholder="e.g., 1,0,1,0,1,0,1,0"
            />
          </div>
        </div>
      )}

      {/* Performance Task Fields */}
      {exerciseData.exercise_type === 'performance_task' && (
        <div className="space-y-4">
          <div>
            <Label>Task Description</Label>
            <Textarea
              value={exerciseData.exercise_data.task_description || ""}
              onChange={(e) => setExerciseData({
                ...exerciseData,
                exercise_data: { ...exerciseData.exercise_data, task_description: e.target.value }
              })}
              placeholder="Describe the performance task..."
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Requirements</h3>
              <Button onClick={addRequirement} size="sm" type="button">
                <Plus className="h-4 w-4 mr-2" />
                Add Requirement
              </Button>
            </div>

            {(exerciseData.exercise_data.requirements || []).map((req: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={req}
                  onChange={(e) => updateRequirement(index, e.target.value)}
                  placeholder={`Requirement ${index + 1}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRequirement(index)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ear Training Fields */}
      {exerciseData.exercise_type === 'ear_training' && (
        <div className="space-y-4">
          <div>
            <Label>Exercise Description</Label>
            <Textarea
              value={exerciseData.exercise_data.exercise_description || ""}
              onChange={(e) => setExerciseData({
                ...exerciseData,
                exercise_data: { ...exerciseData.exercise_data, exercise_description: e.target.value }
              })}
              placeholder="Describe what students should listen for and identify..."
              rows={4}
            />
          </div>

          <div className="p-4 border rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              Note: Audio sample upload functionality will be available in a future update.
            </p>
          </div>
        </div>
      )}

      <Button 
        onClick={() => {
          if (!validateExercise()) {
            return;
          }
          onSave(exerciseData);
        }} 
        className="w-full"
        type="button"
        disabled={!validateExercise()}
      >
        Save Exercise
      </Button>
    </div>
  );
}
