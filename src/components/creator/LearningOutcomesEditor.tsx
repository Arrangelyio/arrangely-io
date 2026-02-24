import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Check } from "lucide-react";
import { useState } from "react";

interface LearningOutcomesEditorProps {
    outcomes: string[];
    onChange: (outcomes: string[]) => void;
}

export default function LearningOutcomesEditor({
    outcomes,
    onChange,
}: LearningOutcomesEditorProps) {
    const [newOutcome, setNewOutcome] = useState("");

    const addOutcome = () => {
        if (newOutcome.trim()) {
            onChange([...outcomes, newOutcome.trim()]);
            setNewOutcome("");
        }
    };

    const removeOutcome = (index: number) => {
        onChange(outcomes.filter((_, i) => i !== index));
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addOutcome();
        }
    };

    return (
        <div className="space-y-4">
            <Label>What You'll Learn</Label>
            <div className="space-y-2">
                {outcomes.map((outcome, index) => (
                    <div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-muted rounded-lg"
                    >
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="flex-1 text-sm">{outcome}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOutcome(index)}
                            className="h-6 w-6 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <Input
                    placeholder="Add a learning outcome..."
                    value={newOutcome}
                    onChange={(e) => setNewOutcome(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <Button
                    type="button"
                    onClick={addOutcome}
                    disabled={!newOutcome.trim()}
                    size="sm"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                Add specific learning outcomes that students will achieve in
                this lesson
            </p>
        </div>
    );
}
