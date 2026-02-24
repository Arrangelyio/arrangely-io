import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DeleteAccountSectionProps {
  userEmail: string;
}

const DeleteAccountSection = ({ userEmail }: DeleteAccountSectionProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const expectedConfirmText = "DELETE";
  const isConfirmValid = confirmText === expectedConfirmText;

  const handleDeleteAccount = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    try {
      // Call the edge function to delete the account
      const { data, error } = await supabase.functions.invoke("delete-user-account", {
        body: { confirmation: confirmText }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to delete account");
      }

      toast({
        title: "Account Deleted",
        description: "Your account and associated data have been permanently deleted.",
      });

      // Sign out and redirect to auth page
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
      setConfirmText("");
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">Warning: This action cannot be undone</p>
              <p className="text-muted-foreground">
                Deleting your account will permanently remove:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Your profile and personal information</li>
                <li>All your songs and arrangements</li>
                <li>Your subscription and payment history</li>
                <li>All other associated data</li>
              </ul>
            </div>
          </div>

          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Account Deletion
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      You are about to permanently delete your account associated with{" "}
                      <strong>{userEmail}</strong>. This action is irreversible.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-delete">
                        Type <strong>DELETE</strong> to confirm:
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                        placeholder="Type DELETE"
                        className="font-mono"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setConfirmText("")}
                  disabled={isDeleting}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={!isConfirmValid || isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeleteAccountSection;
