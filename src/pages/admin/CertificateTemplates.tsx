import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Save, Trash2, Plus, ArrowLeft, Eye, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CertificatePreview, generatePreviewPDF } from "@/components/admin/CertificatePreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CertificateTemplate {
  id: string;
  name: string;
  background_image_url: string | null;
  participant_name_x: number;
  participant_name_y: number;
  participant_name_size: number;
  participant_name_color: string;
  lesson_title_x: number;
  lesson_title_y: number;
  lesson_title_size: number;
  lesson_title_color: string;
  creator_name_x: number;
  creator_name_y: number;
  creator_name_size: number;
  creator_name_color: string;
  is_default: boolean;
}

export default function CertificateTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [downloadingPreview, setDownloadingPreview] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CertificateTemplate[];
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<CertificateTemplate>) => {
      const { data, error } = await supabase
        .from("certificate_templates")
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Template created successfully");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create template: " + error.message);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CertificateTemplate>;
    }) => {
      const { data, error } = await supabase
        .from("certificate_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Template updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update template: " + error.message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certificate_templates").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });

  const handleImageUpload = async (file: File, templateId: string) => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${templateId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("certificate-templates")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("certificate-templates")
        .getPublicUrl(fileName);

      await updateTemplateMutation.mutateAsync({
        id: templateId,
        updates: { background_image_url: urlData.publicUrl },
      });

      toast.success("Background image uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPreview = async (template: CertificateTemplate) => {
    setDownloadingPreview(true);
    try {
      const blob = await generatePreviewPDF(template, {
        participantName: "Arrangely",
        lessonTitle: "Advanced Piano Techniques",
        creatorName: "Jane Smith",
        completionDate: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-preview-${template.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Preview downloaded successfully");
    } catch (error: any) {
      toast.error("Failed to download preview: " + error.message);
    } finally {
      setDownloadingPreview(false);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading templates...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/admin-dashboard-secure-7f8e2a9c")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Certificate Templates</h1>
            <p className="text-muted-foreground">
              Manage certificate templates for lesson completions
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Certificate Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              onSubmit={(data) => createTemplateMutation.mutate(data)}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-2 inline-block">
                      Default
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this template?")) {
                      deleteTemplateMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.background_image_url && (
                <div className="aspect-video w-full rounded border overflow-hidden">
                  <img
                    src={template.background_image_url}
                    alt={template.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs">Participant Name</Label>
                  <div className="text-muted-foreground">
                    Position: ({template.participant_name_x}, {template.participant_name_y}) |
                    Size: {template.participant_name_size}px
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Lesson Title</Label>
                  <div className="text-muted-foreground">
                    Position: ({template.lesson_title_x}, {template.lesson_title_y}) | Size:{" "}
                    {template.lesson_title_size}px
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Creator Name</Label>
                  <div className="text-muted-foreground">
                    Position: ({template.creator_name_x}, {template.creator_name_y}) | Size:{" "}
                    {template.creator_name_size}px
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewTemplate(template);
                    setIsPreviewOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Template</DialogTitle>
                    </DialogHeader>
                    <TemplateForm
                      template={template}
                      onSubmit={(data) =>
                        updateTemplateMutation.mutate({ id: template.id, updates: data })
                      }
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <label htmlFor={`upload-${template.id}`} className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Background
                  </span>
                </Button>
                <input
                  id={`upload-${template.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, template.id);
                    }
                  }}
                />
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificate Preview - {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Visual Preview</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="space-y-4">
                  <CertificatePreview
                    template={previewTemplate}
                    sampleData={{
                      participantName: "Arrangely",
                      lessonTitle: "Advanced Piano Techniques",
                      creatorName: "Jane Smith",
                      completionDate: new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }),
                    }}
                    width={800}
                    height={600}
                  />
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsPreviewOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => handleDownloadPreview(previewTemplate)}
                      disabled={downloadingPreview}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingPreview ? "Generating..." : "Download Preview PDF"}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Participant Name</h4>
                      <div className="text-muted-foreground space-y-1">
                        <p>Position: ({previewTemplate.participant_name_x}, {previewTemplate.participant_name_y})</p>
                        <p>Size: {previewTemplate.participant_name_size}px</p>
                        <p>Color: <span className="inline-block w-4 h-4 rounded border ml-1" style={{ backgroundColor: previewTemplate.participant_name_color }}></span> {previewTemplate.participant_name_color}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Lesson Title</h4>
                      <div className="text-muted-foreground space-y-1">
                        <p>Position: ({previewTemplate.lesson_title_x}, {previewTemplate.lesson_title_y})</p>
                        <p>Size: {previewTemplate.lesson_title_size}px</p>
                        <p>Color: <span className="inline-block w-4 h-4 rounded border ml-1" style={{ backgroundColor: previewTemplate.lesson_title_color }}></span> {previewTemplate.lesson_title_color}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Creator Name</h4>
                      <div className="text-muted-foreground space-y-1">
                        <p>Position: ({previewTemplate.creator_name_x}, {previewTemplate.creator_name_y})</p>
                        <p>Size: {previewTemplate.creator_name_size}px</p>
                        <p>Color: <span className="inline-block w-4 h-4 rounded border ml-1" style={{ backgroundColor: previewTemplate.creator_name_color }}></span> {previewTemplate.creator_name_color}</p>
                      </div>
                    </div>
                    
                    {previewTemplate.background_image_url && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Background Image</h4>
                        <div className="text-muted-foreground">
                          <p className="break-all text-xs">{previewTemplate.background_image_url}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateFormProps {
  template?: CertificateTemplate;
  onSubmit: (data: Partial<CertificateTemplate>) => void;
  onCancel?: () => void;
}

function TemplateForm({ template, onSubmit, onCancel }: TemplateFormProps) {
  const [formData, setFormData] = useState<Partial<CertificateTemplate>>(
    template || {
      name: "",
      participant_name_x: 400,
      participant_name_y: 300,
      participant_name_size: 32,
      participant_name_color: "#000000",
      lesson_title_x: 400,
      lesson_title_y: 400,
      lesson_title_size: 24,
      lesson_title_color: "#64C8B4",
      creator_name_x: 400,
      creator_name_y: 500,
      creator_name_size: 16,
      creator_name_color: "#646464",
      is_default: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Participant Name Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="participant_name_x">X Position (px)</Label>
            <Input
              id="participant_name_x"
              type="number"
              value={formData.participant_name_x}
              onChange={(e) =>
                setFormData({ ...formData, participant_name_x: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="participant_name_y">Y Position (px)</Label>
            <Input
              id="participant_name_y"
              type="number"
              value={formData.participant_name_y}
              onChange={(e) =>
                setFormData({ ...formData, participant_name_y: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="participant_name_size">Font Size (px)</Label>
            <Input
              id="participant_name_size"
              type="number"
              value={formData.participant_name_size}
              onChange={(e) =>
                setFormData({ ...formData, participant_name_size: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="participant_name_color">Color</Label>
            <Input
              id="participant_name_color"
              type="color"
              value={formData.participant_name_color}
              onChange={(e) =>
                setFormData({ ...formData, participant_name_color: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Lesson Title Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lesson_title_x">X Position (px)</Label>
            <Input
              id="lesson_title_x"
              type="number"
              value={formData.lesson_title_x}
              onChange={(e) =>
                setFormData({ ...formData, lesson_title_x: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="lesson_title_y">Y Position (px)</Label>
            <Input
              id="lesson_title_y"
              type="number"
              value={formData.lesson_title_y}
              onChange={(e) =>
                setFormData({ ...formData, lesson_title_y: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="lesson_title_size">Font Size (px)</Label>
            <Input
              id="lesson_title_size"
              type="number"
              value={formData.lesson_title_size}
              onChange={(e) =>
                setFormData({ ...formData, lesson_title_size: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="lesson_title_color">Color</Label>
            <Input
              id="lesson_title_color"
              type="color"
              value={formData.lesson_title_color}
              onChange={(e) => setFormData({ ...formData, lesson_title_color: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Creator Name Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="creator_name_x">X Position (px)</Label>
            <Input
              id="creator_name_x"
              type="number"
              value={formData.creator_name_x}
              onChange={(e) =>
                setFormData({ ...formData, creator_name_x: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="creator_name_y">Y Position (px)</Label>
            <Input
              id="creator_name_y"
              type="number"
              value={formData.creator_name_y}
              onChange={(e) =>
                setFormData({ ...formData, creator_name_y: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="creator_name_size">Font Size (px)</Label>
            <Input
              id="creator_name_size"
              type="number"
              value={formData.creator_name_size}
              onChange={(e) =>
                setFormData({ ...formData, creator_name_size: parseInt(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="creator_name_color">Color</Label>
            <Input
              id="creator_name_color"
              type="color"
              value={formData.creator_name_color}
              onChange={(e) => setFormData({ ...formData, creator_name_color: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
