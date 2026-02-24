import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface QuizExerciseProps {
  questions: QuizQuestion[];
  onComplete: (answers: { [key: number]: number }, score: number) => void;
  initialAnswers?: { [key: number]: number };
  initialScore?: number;
}

export default function QuizExercise({ 
  questions, 
  onComplete, 
  initialAnswers = {},
  initialScore
}: QuizExerciseProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>(initialAnswers);
  const [submitted, setSubmitted] = useState(!!initialScore);
  const [score, setScore] = useState(initialScore || 0);

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (submitted) return; // Prevent changes after submission
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmit = () => {
    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_answer) {
        correctCount++;
      }
    });
    
    setScore(correctCount);
    setSubmitted(true);
    
    // Call onComplete with answers and score
    setTimeout(() => {
      onComplete(selectedAnswers, correctCount);
    }, 500);
  };

  const allAnswered = questions.every((_, idx) => selectedAnswers[idx] !== undefined);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Quiz Exercise</h3>
          {submitted && (
            <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <Award className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-lg">
                  Your Score: {score} / {questions.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {score === questions.length 
                    ? "Perfect! You got all answers correct!" 
                    : `You got ${Math.round((score / questions.length) * 100)}% correct`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {questions.map((q, questionIdx) => {
            const selectedOption = selectedAnswers[questionIdx];
            const isCorrect = submitted && selectedOption === q.correct_answer;
            const isIncorrect = submitted && selectedOption !== undefined && selectedOption !== q.correct_answer;

            return (
              <div 
                key={questionIdx} 
                className={cn(
                  "p-4 border rounded-lg transition-all",
                  submitted && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/20",
                  submitted && isIncorrect && "border-red-500 bg-red-50 dark:bg-red-950/20"
                )}
              >
                <div className="flex items-start gap-2 mb-3">
                  {submitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />}
                  {submitted && isIncorrect && <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />}
                  <p className="font-medium flex-1">
                    {questionIdx + 1}. {q.question}
                  </p>
                </div>

                <div className="space-y-2 ml-7">
                  {q.options.map((option, optIdx) => {
                    const isSelected = selectedOption === optIdx;
                    const isCorrectAnswer = q.correct_answer === optIdx;
                    const showAsCorrect = submitted && isCorrectAnswer;
                    const showAsIncorrect = submitted && isSelected && !isCorrectAnswer;

                    return (
                      <label
                        key={optIdx}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                          !submitted && "hover:bg-muted",
                          submitted && "cursor-not-allowed",
                          isSelected && !submitted && "bg-primary/10 border-primary",
                          showAsCorrect && "bg-green-100 dark:bg-green-950/30 border-green-500",
                          showAsIncorrect && "bg-red-100 dark:bg-red-950/30 border-red-500"
                        )}
                      >
                        <input
                          type="radio"
                          name={`question-${questionIdx}`}
                          checked={isSelected}
                          onChange={() => handleSelectAnswer(questionIdx, optIdx)}
                          disabled={submitted}
                          className="cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="flex-1">{option}</span>
                        {showAsCorrect && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {showAsIncorrect && <XCircle className="h-4 w-4 text-red-500" />}
                      </label>
                    );
                  })}
                </div>

                {submitted && isIncorrect && (
                  <p className="text-sm text-muted-foreground mt-3 ml-7">
                    Correct answer: {q.options[q.correct_answer]}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!submitted && (
          <Button
            className="w-full mt-6"
            size="lg"
            onClick={handleSubmit}
            disabled={!allAnswered}
          >
            {allAnswered ? "Submit Quiz" : `Answer all questions (${Object.keys(selectedAnswers).length}/${questions.length})`}
          </Button>
        )}

        {submitted && (
          <div className="mt-6 p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Quiz submitted! This music lab has been marked as complete.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
