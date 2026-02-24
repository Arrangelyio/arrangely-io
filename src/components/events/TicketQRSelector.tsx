import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCode, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface Ticket {
  id: string;
  registration_id: string;
  qr_code_data: string | null;
  ticket_number: string;
  status: string;
  ticket_category_id: string;
  participant_name: string;
  participant_email: string;
}

interface TicketCategory {
  id: string;
  name: string;
  ticket_type_id: string;
}

interface TicketType {
  id: string;
  name: string;
}

interface TicketQRSelectorProps {
  tickets: Ticket[];
  ticketCategories: TicketCategory[];
  ticketTypes: TicketType[];
  onShowQR: (ticket: Ticket) => void;
}

export function TicketQRSelector({
  tickets,
  ticketCategories,
  ticketTypes,
  onShowQR,
}: TicketQRSelectorProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showAllTickets, setShowAllTickets] = useState(false);
  const { t } = useLanguage();

  // If there are 5 or fewer tickets, show them all directly
  if (tickets.length <= 5) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">
          {tickets.length} Ticket{tickets.length > 1 ? "s" : ""}
        </p>
        {tickets.map((ticket, idx) => (
          <Button
            key={ticket.id}
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onShowQR(ticket)}
            disabled={!ticket.qr_code_data}
          >
            <QrCode className="h-4 w-4 mr-2" />
            {/* Show QR Code  */}
            {t("myTicket.show")}

            {tickets.length > 1 ? `#${idx + 1}` : ""}
          </Button>
        ))}
      </div>
    );
  }

  // Group tickets by type and category
  const typeMap = new Map<string, TicketType>();
  ticketTypes.forEach((type) => typeMap.set(type.id, type));

  const categoryMap = new Map<string, TicketCategory>();
  ticketCategories.forEach((cat) => categoryMap.set(cat.id, cat));

  // Get unique ticket types from tickets
  const availableTypes = new Map<string, { type: TicketType; count: number }>();
  tickets.forEach((ticket) => {
    const category = categoryMap.get(ticket.ticket_category_id);
    if (category) {
      const type = typeMap.get(category.ticket_type_id);
      if (type) {
        const existing = availableTypes.get(type.id);
        if (existing) {
          existing.count++;
        } else {
          availableTypes.set(type.id, { type, count: 1 });
        }
      }
    }
  });

  // Get categories for selected type
  const availableCategories = new Map<
    string,
    { category: TicketCategory; tickets: Ticket[] }
  >();
  if (selectedType) {
    tickets.forEach((ticket) => {
      const category = categoryMap.get(ticket.ticket_category_id);
      if (category && category.ticket_type_id === selectedType) {
        const existing = availableCategories.get(category.id);
        if (existing) {
          existing.tickets.push(ticket);
        } else {
          availableCategories.set(category.id, {
            category,
            tickets: [ticket],
          });
        }
      }
    });
  }

  // Get tickets for selected category
  const filteredTickets = selectedCategory
    ? tickets.filter((t) => t.ticket_category_id === selectedCategory)
    : [];

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            {tickets.length} Total Tickets
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllTickets(!showAllTickets)}
          >
            {showAllTickets ? "Use Selector" : t("myTicket.all")}
            <ChevronDown
              className={`h-4 w-4 ml-2 transition-transform ${
                showAllTickets ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>

        {showAllTickets ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tickets.map((ticket, idx) => {
              const category = categoryMap.get(ticket.ticket_category_id);
              const type = category
                ? typeMap.get(category.ticket_type_id)
                : null;

              return (
                <Button
                  key={ticket.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => onShowQR(ticket)}
                  disabled={!ticket.qr_code_data}
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    <span className="text-xs">
                      {type?.name} - {category?.name} #{idx + 1}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {ticket.participant_name}
                  </Badge>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Select Ticket Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                1. {t("myTicket.select")}
              </label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose ticket type..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(availableTypes.values()).map(
                    ({ type, count }) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({count} ticket{count > 1 ? "s" : ""})
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Category */}
            {selectedType && availableCategories.size > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  2. Select Ticket Category
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(availableCategories.values()).map(
                      ({ category, tickets }) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name} ({tickets.length} ticket
                          {tickets.length > 1 ? "s" : ""})
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Show QR Codes */}
            {selectedCategory && filteredTickets.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  3. Select Ticket to View QR
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredTickets.map((ticket, idx) => (
                    <Button
                      key={ticket.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => onShowQR(ticket)}
                      disabled={!ticket.qr_code_data}
                    >
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        <span className="text-sm">Ticket #{idx + 1}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {ticket.participant_name}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
