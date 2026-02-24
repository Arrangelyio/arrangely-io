import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Users, Send, Loader2, X, Image as ImageIcon } from "lucide-react";

interface NotificationRecipient {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  display_name?: string;
}

const AdminPushNotifications = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<string>("");
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [customData, setCustomData] = useState<Record<string, string>>({});

  const fetchRecipients = async (filter: string) => {
    setLoadingRecipients(true);
    setRecipients([]);
    setSelectedRecipients([]);

    try {
      let query = supabase
        .from('push_notification_tokens')
        .select(`
          id,
          user_id,
          token,
          platform
        `);

      // Apply filters
      if (filter === 'all') {
        // No additional filter
      } else if (filter === 'android') {
        query = query.eq('platform', 'android');
      } else if (filter === 'ios') {
        query = query.eq('platform', 'ios');
      } else if (filter === 'subscribers') {
        // Get users with active subscriptions
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('status', 'active');
        
        if (subscriptions && subscriptions.length > 0) {
          const userIds = subscriptions.map(s => s.user_id);
          query = query.in('user_id', userIds);
        } else {
          setRecipients([]);
          setLoadingRecipients(false);
          return;
        }
      } else if (filter === 'event_attendees') {
        // Get users who have registered for events
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('user_id')
          .eq('status', 'confirmed');
        
        if (registrations && registrations.length > 0) {
          const userIds = [...new Set(registrations.map(r => r.user_id))];
          query = query.in('user_id', userIds);
        } else {
          setRecipients([]);
          setLoadingRecipients(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user profiles for display names
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]));

      const recipientsWithNames = (data || []).map(r => ({
        ...r,
        display_name: profileMap.get(r.user_id) || 'Unknown User',
      }));

      setRecipients(recipientsWithNames);
      setSelectedRecipients(recipientsWithNames.map(r => r.id));
    } catch (err: any) {
      console.error("Error fetching recipients:", err);
      toast({
        title: "Error",
        description: "Failed to fetch recipients: " + err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    setRecipientFilter(filter);
    if (filter) {
      fetchRecipients(filter);
    } else {
      setRecipients([]);
      setSelectedRecipients([]);
    }
  };

  const toggleRecipient = (recipientId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(recipientId) 
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const selectAll = () => {
    setSelectedRecipients(recipients.map(r => r.id));
  };

  const deselectAll = () => {
    setSelectedRecipients([]);
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both title and body for the notification",
        variant: "destructive",
      });
      return;
    }

    if (selectedRecipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get tokens for selected recipients
      const selectedTokens = recipients
        .filter(r => selectedRecipients.includes(r.id))
        .map(r => r.token);

      // Call edge function to send push notifications
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens: selectedTokens,
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          data: Object.keys(customData).length > 0 ? customData : undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Push notification sent to ${data.successCount} device(s). ${data.failureCount} failed.`,
      });

      // Reset form
      setTitle("");
      setBody("");
      setImageUrl("");
      setCustomData({});
      setRecipients([]);
      setSelectedRecipients([]);
      setRecipientFilter("");
    } catch (err: any) {
      console.error("Error sending push notification:", err);
      toast({
        title: "Error",
        description: "Failed to send push notification: " + err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRecipientsData = recipients.filter(r => 
    selectedRecipients.includes(r.id)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Push Notifications</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notification Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Notification title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body *</Label>
              <Textarea
                id="body"
                placeholder="Notification message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {body.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button variant="outline" size="icon" disabled>
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Rich image displayed in notification (Android 4.1+, iOS 10+)
              </p>
            </div>

            <Button
              onClick={handleSendNotification}
              disabled={loading || selectedRecipients.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to {selectedRecipients.length} Device(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recipients Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter">Recipient Filter</Label>
              <Select value={recipientFilter} onValueChange={handleFilterChange}>
                <SelectTrigger id="filter">
                  <SelectValue placeholder="Select recipient group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="android">Android Users</SelectItem>
                  <SelectItem value="ios">iOS Users</SelectItem>
                  <SelectItem value="subscribers">Active Subscribers</SelectItem>
                  <SelectItem value="event_attendees">Event Attendees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingRecipients && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {recipients.length > 0 && (
              <>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>

                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="flex items-center gap-3 p-2 hover:bg-accent rounded-md"
                    >
                      <Checkbox
                        checked={selectedRecipients.includes(recipient.id)}
                        onCheckedChange={() => toggleRecipient(recipient.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {recipient.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {recipient.platform}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedRecipientsData.length > 0 && (
              <div className="space-y-2">
                <Label>Selected ({selectedRecipientsData.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipientsData.slice(0, 10).map((recipient) => (
                    <Badge key={recipient.id} variant="secondary">
                      {recipient.display_name}
                      <button
                        onClick={() => toggleRecipient(recipient.id)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedRecipientsData.length > 10 && (
                    <Badge variant="outline">
                      +{selectedRecipientsData.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPushNotifications;
