import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface TicketPurchaser {
  email: string;
  full_name: string;
  phone_number: string;
  id_number: string;
  quantity: number;
}

interface TicketPurchaserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  eventId: string;
}

export const TicketPurchaserDialog = ({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  eventId,
}: TicketPurchaserDialogProps) => {
  const { data: purchasers, isLoading } = useQuery({
    queryKey: ["ticket-purchasers", categoryId, eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_tickets")
        .select(`
          id,
          registration_id,
          event_registrations!inner(
            attendee_email,
            attendee_name,
            attendee_phone
          )
        `)
        .eq("event_id", eventId)
        .eq("ticket_category_id", categoryId);

      if (error) throw error;

      // Group by registration to count quantities
      const purchaserMap = new Map<string, TicketPurchaser>();
      
      data?.forEach((ticket: any) => {
        const reg = ticket.event_registrations;
        const key = reg.attendee_email;
        
        if (purchaserMap.has(key)) {
          const existing = purchaserMap.get(key)!;
          existing.quantity += 1;
        } else {
          purchaserMap.set(key, {
            email: reg.attendee_email,
            full_name: reg.attendee_name,
            phone_number: reg.attendee_phone || "-",
            id_number: "-",
            quantity: 1,
          });
        }
      });

      return Array.from(purchaserMap.values());
    },
    enabled: open && !!categoryId && !!eventId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ticket Purchasers - {categoryName}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>ID (KTP)</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchasers && purchasers.length > 0 ? (
                  purchasers.map((purchaser, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{purchaser.email}</TableCell>
                      <TableCell>{purchaser.full_name}</TableCell>
                      <TableCell>{purchaser.phone_number}</TableCell>
                      <TableCell>{purchaser.id_number}</TableCell>
                      <TableCell className="text-right">{purchaser.quantity}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No purchasers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
