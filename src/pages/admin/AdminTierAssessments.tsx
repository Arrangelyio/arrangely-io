import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, Music, BookOpen, Disc, Mic, PenTool } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThresholdSettings } from "@/components/admin/tier-assessment/ThresholdSettings";

const TIER_LEVELS = [
  { value: 1, label: "Basic (Pemula)" },
  { value: 2, label: "Intermediate (Menengah)" },
  { value: 3, label: "Advanced (Mahir)" },
  { value: 4, label: "Master (Ahli)" }
];

const CATEGORIES = [
  { id: "instrument", name: "Instrumen", icon: Music },
  { id: "theory", name: "Teori Musik", icon: BookOpen },
  { id: "production", name: "Produksi", icon: Disc },
  { id: "songwriting", name: "Songwriting", icon: PenTool },
  { id: "worship_leader", name: "Worship Leader", icon: Mic }
];

const INSTRUMENTS = ["guitar", "bass", "saxophone", "drum", "vocals", "piano"];

interface Question {
  id: string;
  category: string;
  sub_category: string;
  tier_level: number;
  instrument: string | null;
  question_text: string;
  options: any[];
  media_url: string | null;
  explanation: string | null;
}

const AdminTierAssessments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTier, setFilterTier] = useState("all");

  const [questionForm, setQuestionForm] = useState({
    category: "instrument",
    sub_category: "",
    tier_level: 1,
    instrument: "",
    question_text: "",
    options: [
      { id: "A", text: "", isCorrect: false },
      { id: "B", text: "", isCorrect: false },
      { id: "C", text: "", isCorrect: false },
      { id: "D", text: "", isCorrect: false }
    ],
    media_url: "",
    explanation: ""
  });

  const { data: questionsData, isLoading } = useQuery({
    queryKey: ["tier-assessment-questions", searchQuery, filterCategory, filterTier],
    queryFn: async () => {
      let query = supabase
        .from("tier_assessment_questions")
        .select("*")
        .eq("is_production", true);

      if (searchQuery) {
        query = query.ilike("question", `%${searchQuery}%`);
      }

      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }

      if (filterTier !== "all") {
        query = query.eq("tier_level", parseInt(filterTier));
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as Question[];
    }
  });

  const {
    currentPage,
    totalPages,
    paginatedData: questions,
    nextPage,
    prevPage,
    goToPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: questionsData || [],
    itemsPerPage: 10
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: typeof questionForm) => {
      // Auto-set sub_category based on category
      const subCategory = data.category === "instrument" ? data.instrument : data.category;
      
      const { error } = await supabase
        .from("tier_assessment_questions")
        .insert([{ 
          category: data.category,
          sub_category: subCategory,
          tier_level: data.tier_level,
          instrument: data.category === "instrument" ? data.instrument : "general",
          question_text: data.question_text,
          options: data.options,
          media_url: data.media_url || null,
          explanation: data.explanation || null,
          is_production: true 
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tier-assessment-questions"] });
      toast({ title: "Question created successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error creating question", description: error.message, variant: "destructive" });
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: typeof questionForm }) => {
      // Auto-set sub_category based on category
      const subCategory = data.category === "instrument" ? data.instrument : data.category;
      
      const { error } = await supabase
        .from("tier_assessment_questions")
        .update({
          category: data.category,
          sub_category: subCategory,
          tier_level: data.tier_level,
          instrument: data.category === "instrument" ? data.instrument : "general",
          question_text: data.question_text,
          options: data.options,
          media_url: data.media_url || null,
          explanation: data.explanation || null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tier-assessment-questions"] });
      toast({ title: "Question updated successfully" });
      setDialogOpen(false);
      setEditingQuestion(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error updating question", description: error.message, variant: "destructive" });
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tier_assessment_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tier-assessment-questions"] });
      toast({ title: "Question deleted successfully" });
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting question", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setQuestionForm({
      category: "instrument",
      sub_category: "",
      tier_level: 1,
      instrument: "",
      question_text: "",
      options: [
        { id: "A", text: "", isCorrect: false },
        { id: "B", text: "", isCorrect: false },
        { id: "C", text: "", isCorrect: false },
        { id: "D", text: "", isCorrect: false }
      ],
      media_url: "",
      explanation: ""
    });
    setEditingQuestion(null);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      category: question.category,
      sub_category: question.sub_category,
      tier_level: question.tier_level,
      instrument: question.instrument || "",
      question_text: question.question_text,
      options: question.options,
      media_url: question.media_url || "",
      explanation: question.explanation || ""
    });
    setDialogOpen(true);
  };

  const setCorrectAnswer = (optionId: string) => {
    const updatedOptions = questionForm.options.map(opt => ({
      ...opt,
      isCorrect: opt.id === optionId
    }));
    setQuestionForm({ ...questionForm, options: updatedOptions });
  };

  const getTierBadge = (tier: number) => {
    const colors: Record<number, string> = {
      1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      3: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      4: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    };
    const labels: Record<number, string> = {
      1: "Basic (Pemula)",
      2: "Intermediate (Menengah)",
      3: "Advanced (Mahir)",
      4: "Master (Ahli)"
    };
    return (
      <Badge className={colors[tier] || colors[1]}>
        {labels[tier] || "Unknown"}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Your Level Management</h1>
        <p className="text-muted-foreground">
          Manage tier assessment questions and passing thresholds
        </p>
      </div>

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="thresholds">Passing Thresholds</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card>
        <CardHeader>
          <CardTitle>Tier Assessment Questions</CardTitle>
          <CardDescription>
            Manage questions for Instrument, Music Theory, Production, Worship Leading, and Songwriting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {TIER_LEVELS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value.toString()}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? "Edit" : "Add"} Question</DialogTitle>
                  <DialogDescription>
                    Create questions for the tier assessment system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select
                        value={questionForm.category}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tier Level</label>
                      <Select
                        value={questionForm.tier_level.toString()}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, tier_level: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIER_LEVELS.map((tier) => (
                            <SelectItem key={tier.value} value={tier.value.toString()}>
                              {tier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Instrument (Optional - for instrument category)</label>
                    <Select
                      value={questionForm.instrument || undefined}
                      onValueChange={(value) => setQuestionForm({ ...questionForm, instrument: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select instrument (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTRUMENTS.map((inst) => (
                          <SelectItem key={inst} value={inst}>
                            {inst.charAt(0).toUpperCase() + inst.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Question Text</label>
                    <Textarea
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                      placeholder="Enter your question"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Answer Options</label>
                    <div className="space-y-2 mt-2">
                      {questionForm.options.map((option, index) => (
                        <div key={option.id} className="flex gap-2 items-center">
                          <span className="w-8 flex items-center font-medium">{option.id}.</span>
                          <Input
                            value={option.text}
                            onChange={(e) => {
                              const newOptions = [...questionForm.options];
                              newOptions[index].text = e.target.value;
                              setQuestionForm({ ...questionForm, options: newOptions });
                            }}
                            placeholder={`Option ${option.id}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant={option.isCorrect ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCorrectAnswer(option.id)}
                          >
                            {option.isCorrect ? "✓ Correct" : "Set as Correct"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Media URL (Optional)</label>
                    <Input
                      value={questionForm.media_url}
                      onChange={(e) => setQuestionForm({ ...questionForm, media_url: e.target.value })}
                      placeholder="Audio/Image URL"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Explanation (Optional)</label>
                    <Textarea
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      placeholder="Explanation for the correct answer"
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={() => {
                      const hasCorrectAnswer = questionForm.options.some(opt => opt.isCorrect);
                      if (!hasCorrectAnswer) {
                        toast({ 
                          title: "Missing correct answer", 
                          description: "Please select one option as the correct answer",
                          variant: "destructive" 
                        });
                        return;
                      }
                      
                      if (editingQuestion) {
                        updateQuestionMutation.mutate({ id: editingQuestion.id, data: questionForm });
                      } else {
                        createQuestionMutation.mutate(questionForm);
                      }
                    }}
                    disabled={!questionForm.question_text}
                    className="w-full"
                  >
                    {editingQuestion ? "Update" : "Create"} Question
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No questions found
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((question: any) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <div className="line-clamp-2">{question.question_text}</div>
                      </TableCell>
                      <TableCell>
                        {CATEGORIES.find(c => c.id === question.category)?.name || question.category}
                      </TableCell>
                      <TableCell>
                        {question.instrument && question.instrument !== 'general' ? (
                          <Badge variant="secondary">
                            {question.instrument.charAt(0).toUpperCase() + question.instrument.slice(1)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{getTierBadge(question.tier_level)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditQuestion(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setQuestionToDelete(question.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex}-{endIndex} of {totalItems} questions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!canGoNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="thresholds">
          <ThresholdSettings />
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => questionToDelete && deleteQuestionMutation.mutate(questionToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTierAssessments;
