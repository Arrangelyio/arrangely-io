import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TicketType {
  id: string;
  name: string;
  description?: string;
  event_id: string;
  order_index: number;
}

interface TicketCategory {
  id: string;
  ticket_type_id: string;
  name: string;
  description?: string;
  price: number;
  quota: number;
  sold_count: number;
  sale_start_date?: string;
  sale_end_date?: string;
  order_index: number;
}

interface TicketManagementProps {
  eventId: string;
}

export function TicketManagement({ eventId }: TicketManagementProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    []
  );
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingType, setEditingType] = useState<TicketType | null>(null);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(
    null
  );
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");

  const [typeForm, setTypeForm] = useState({
    name: "",
    description: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    price: "",
    quota: "",
    sale_start_date: "",
    sale_end_date: "",
  });

  useEffect(() => {
    fetchTicketTypes();
    fetchTicketCategories();
  }, [eventId]);

  const fetchTicketTypes = async () => {
    const { data, error } = await supabase
      .from("event_ticket_types")
      .select("*")
      .eq("event_id", eventId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching ticket types:", error);
      return;
    }
    setTicketTypes(data || []);
  };

  const fetchTicketCategories = async () => {
    const { data, error } = await supabase
      .from("event_ticket_categories")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching ticket categories:", error);
      return;
    }
    setTicketCategories(data || []);
  };

  const toggleTypeExpansion = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  const handleCreateType = async () => {
    const { error } = await supabase.from("event_ticket_types").insert({
      event_id: eventId,
      name: typeForm.name,
      description: typeForm.description,
      order_index: ticketTypes.length,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket type",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket type created successfully",
    });
    setShowTypeDialog(false);
    setTypeForm({ name: "", description: "" });
    fetchTicketTypes();
  };

  const handleUpdateType = async () => {
    if (!editingType) return;

    const { error } = await supabase
      .from("event_ticket_types")
      .update({
        name: typeForm.name,
        description: typeForm.description,
      })
      .eq("id", editingType.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket type",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket type updated successfully",
    });
    setShowTypeDialog(false);
    setEditingType(null);
    setTypeForm({ name: "", description: "" });
    fetchTicketTypes();
  };

  const handleDeleteType = async (typeId: string) => {
    const { error } = await supabase
      .from("event_ticket_types")
      .delete()
      .eq("id", typeId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket type",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket type deleted successfully",
    });
    fetchTicketTypes();
  };

  const handleCreateCategory = async () => {
    const { error } = await supabase.from("event_ticket_categories").insert({
      event_id: eventId,
      ticket_type_id: selectedTypeId,
      name: categoryForm.name,
      description: categoryForm.description,
      price: categoryForm.price,
      quota: categoryForm.quota,
      max_purchase: 1,
      remaining_quota: categoryForm.quota, // Initialize remaining_quota with the same value as quota
      sale_start_date: categoryForm.sale_start_date || null,
      sale_end_date: categoryForm.sale_end_date || null,
      order_index: ticketCategories.filter(
        (c) => c.ticket_type_id === selectedTypeId
      ).length,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket category",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket category created successfully",
    });
    setShowCategoryDialog(false);
    setCategoryForm({
      name: "",
      description: "",
      price: "",
      quota: "",
      sale_start_date: "",
      sale_end_date: "",
    });
    fetchTicketCategories();
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    const { error } = await supabase
      .from("event_ticket_categories")
      .update({
        name: categoryForm.name,
        description: categoryForm.description,
        price: categoryForm.price,
        quota: categoryForm.quota,
        sale_start_date: categoryForm.sale_start_date || null,
        sale_end_date: categoryForm.sale_end_date || null,
      })
      .eq("id", editingCategory.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket category",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket category updated successfully",
    });
    setShowCategoryDialog(false);
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      description: "",
      price: "",
      quota: "",
      sale_start_date: "",
      sale_end_date: "",
    });
    fetchTicketCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("event_ticket_categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete ticket category",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket category deleted successfully",
    });
    fetchTicketCategories();
  };

  const openEditTypeDialog = (type: TicketType) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      description: type.description || "",
    });
    setShowTypeDialog(true);
  };

  const openEditCategoryDialog = (category: TicketCategory) => {
    const formatForInput = (dateString?: string) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      // adjust to local timezone and format for datetime-local input
      const offset = date.getTimezoneOffset();
      const local = new Date(date.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };

    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      price: category.price?.toString() ?? "",
      quota: category.quota?.toString() ?? "",
      sale_start_date: formatForInput(category.sale_start_date),
      sale_end_date: formatForInput(category.sale_end_date),
    });
    setShowCategoryDialog(true);
  };

  const openAddCategoryDialog = (typeId: string) => {
    setSelectedTypeId(typeId);
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      description: "",
      price: "",
      quota: "",
      sale_start_date: "",
      sale_end_date: "",
    });
    setShowCategoryDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Ticket Management</h3>
        <Dialog
          open={showTypeDialog}
          onOpenChange={(open) => {
            setShowTypeDialog(open);
            if (!open) {
              setEditingType(null);
              setTypeForm({ name: "", description: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Ticket Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Edit" : "Create"} Ticket Type
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type Name</Label>
                <Input
                  value={typeForm.name}
                  onChange={(e) =>
                    setTypeForm({ ...typeForm, name: e.target.value })
                  }
                  placeholder="e.g., PAKET BERDUA"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={typeForm.description}
                  onChange={(e) =>
                    setTypeForm({ ...typeForm, description: e.target.value })
                  }
                  placeholder="Brief description"
                />
              </div>
              <Button
                onClick={editingType ? handleUpdateType : handleCreateType}
                className="w-full"
              >
                {editingType ? "Update" : "Create"} Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {ticketTypes.map((type) => {
          const categories = ticketCategories.filter(
            (c) => c.ticket_type_id === type.id
          );
          const isExpanded = expandedTypes.has(type.id);

          return (
            <Card key={type.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleTypeExpansion(type.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      ({categories.length}{" "}
                      {categories.length === 1 ? "category" : "categories"})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTypeDialog(type);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteType(type.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {type.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {type.description}
                  </p>
                )}
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddCategoryDialog(type.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Quota</TableHead>
                          <TableHead>Sold</TableHead>
                          <TableHead>Sale Period</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {category.name}
                                </div>
                                {category.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {category.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              Rp{category.price.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>{category.quota}</TableCell>
                            <TableCell>{category.sold_count}</TableCell>
                            <TableCell>
                              {category.sale_start_date &&
                              category.sale_end_date
                                ? `${format(
                                    new Date(category.sale_start_date),
                                    "dd MMM"
                                  )} - ${format(
                                    new Date(category.sale_end_date),
                                    "dd MMM yyyy"
                                  )}`
                                : "Always available"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openEditCategoryDialog(category)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog
        open={showCategoryDialog}
        onOpenChange={(open) => {
          setShowCategoryDialog(open);
          if (!open) {
            setEditingCategory(null);
            setSelectedTypeId("");
            setCategoryForm({
              name: "",
              description: "",
              price: "",
              quota: "",
              sale_start_date: "",
              sale_end_date: "",
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit" : "Create"} Ticket Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="e.g., Paket Couple (Festival)"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                placeholder="Price include local tax 10% exclude admin fee 4%"
              />
            </div>
            <div>
              <Label>Price (IDR)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={categoryForm.price}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/[^0-9]/g, "");
                  setCategoryForm((prev) => ({
                    ...prev,
                    price: numericValue,
                  }));
                }}
              />
            </div>
            <div>
              <Label>Quota</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={categoryForm.quota}
                onChange={(e) => {
                  if (editingCategory) return; // prevent changes when editing
                  const numericValue = e.target.value.replace(/[^0-9]/g, "");
                  setCategoryForm((prev) => ({
                    ...prev,
                    quota: numericValue,
                  }));
                }}
                disabled={!!editingCategory} // disable input while editing
              />
              {editingCategory && (
                <p className="text-xs text-yellow-600 mt-1">
                  Quota cannot be changed. To increase the quota, please add a new category instead.
                </p>
              )}
            </div>
            <div>
              <Label>Sale Start Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={categoryForm.sale_start_date}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    sale_start_date: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Sale End Date (Optional)</Label>
              <Input
                type="datetime-local"
                value={categoryForm.sale_end_date}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    sale_end_date: e.target.value,
                  })
                }
              />
            </div>
            <Button
              onClick={
                editingCategory ? handleUpdateCategory : handleCreateCategory
              }
              className="w-full"
            >
              {editingCategory ? "Update" : "Create"} Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
