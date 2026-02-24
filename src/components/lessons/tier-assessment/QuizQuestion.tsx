import { useState, useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

interface QuizQuestionProps {
    question: any;
    currentIndex: number;
    totalQuestions: number;
    onAnswer: (questionId: string, answer: string) => void;
}

export const QuizQuestion = ({
    question,
    currentIndex,
    totalQuestions,
    onAnswer,
}: QuizQuestionProps) => {
    const [selectedAnswer, setSelectedAnswer] = useState<string>("");
    const [hasAnswered, setHasAnswered] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(10);
    const [shuffledOptions, setShuffledOptions] = useState<any[]>([]);

    useEffect(() => {
        setSelectedAnswer("");
        setHasAnswered(false);
        setTimeLeft(10);
    }, [question?.id, currentIndex]);

    const handleTimeExpired = useCallback(() => {
        setHasAnswered(true);
        setTimeout(() => {
            onAnswer(question.id, "");
        }, 2000);
    }, [question.id, onAnswer]);

    const shuffleArray = (arr: any[]) => {
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    };

    useEffect(() => {
        if (question?.options) {
            setShuffledOptions(shuffleArray(question.options));
        }
    }, [question?.id]);

    useEffect(() => {
        if (hasAnswered) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeExpired();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [hasAnswered, handleTimeExpired]);

    const handleSelect = (optionId: string) => {
        if (hasAnswered) return;

        setSelectedAnswer(optionId);
        setHasAnswered(true);

        // Langsung pindah ke jawaban selanjutnya setelah 2 detik
        setTimeout(() => {
            onAnswer(question.id, optionId);
        }, 2000);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                        Question {currentIndex + 1} of {totalQuestions}
                    </span>
                    <span>
                        {Math.round(
                            ((currentIndex + 1) / totalQuestions) * 100,
                        )}
                        %
                    </span>
                </div>
                <Progress value={((currentIndex + 1) / totalQuestions) * 100} />
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center">
                <div
                    className={`
                    px-4 py-2 rounded-full font-bold text-lg
                    ${
                        timeLeft <= 3
                            ? "bg-red-500/20 text-red-600 animate-pulse"
                            : "bg-primary/20 text-primary"
                    }
                `}
                >
                    {timeLeft}s
                </div>
            </div>

            {/* Question */}
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-foreground">
                    {question.question_text}
                </h3>

                {question.media_url && (
                    <div className="bg-muted rounded-lg p-4">
                        <audio
                            src={question.media_url}
                            controls
                            className="w-full"
                        />
                    </div>
                )}

                {/* Options */}
                <div className="grid gap-3">
                    {shuffledOptions.map((option: any, index: number) => {
                        const optionId = option.id || index.toString();
                        const optionLetter = String.fromCharCode(65 + index);
                        const isSelected = selectedAnswer === optionId;

                        return (
                            <button
                                key={optionId}
                                onClick={() => handleSelect(optionId)}
                                disabled={hasAnswered}
                                className={`
                                    relative p-4 rounded-lg border-2 text-left transition-all
                                    ${!hasAnswered && "hover:border-primary/50"}
                                    /* State saat dipilih: Gunakan warna primer saja, tanpa hijau/merah */
                                    ${
                                        isSelected
                                            ? "border-primary bg-primary/10"
                                            : "border-border"
                                    }
                                    ${
                                        hasAnswered &&
                                        "cursor-not-allowed opacity-75"
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`
                                        w-8 h-8 rounded-full border-2 flex items-center justify-center
                                        ${
                                            isSelected
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border"
                                        }
                                    `}
                                    >
                                        {isSelected ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            optionLetter
                                        )}
                                    </div>
                                    <span className="font-medium">
                                        {option.text}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
