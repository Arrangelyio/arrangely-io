import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Users, Send, Loader2, X } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface EmailRecipient {
  id: string;
  email: string;
  display_name: string;
  role?: string;
}

const AdminBulkEmail = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<string>("");
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
const pageSize = 50;
const [hasMore, setHasMore] = useState(false);

const fetchRecipients = async (filter: string, pageNum = 1) => {
  setLoadingRecipients(true);
  setRecipients([]);
  setSelectedRecipients([]);

  try {
    const { data, error } = await supabase.functions.invoke("fetch-recipients", {
      body: { filter, page: pageNum, pageSize },
    });

    if (error) throw error;

    const recipients = data?.recipients || [];
    setRecipients(recipients);
    setSelectedRecipients(recipients.map((r: any) => r.id));
    setPage(pageNum);
    setHasMore(data?.hasMore || false);
  } catch (err: any) {
    console.error("Error fetching recipients:", err);
    toast({
      title: "Error",
      description: "Failed to fetch recipients: " + (err.message ?? ""),
      variant: "destructive",
    });
  } finally {
    setLoadingRecipients(false);
  }
};



  const handleFilterChange = (filter: string) => {
    setRecipientFilter(filter);
    setSearchTerm(""); // Reset search when filter changes
    if (filter) {
      fetchRecipients(filter);
    } else {
      setRecipients([]);
      setSelectedRecipients([]);
    }
  };

  // Filter recipients based on search term
  const filteredRecipients = recipients.filter(recipient => 
    recipient.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRecipient = (recipientId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(recipientId) 
        ? prev.filter(id => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const selectAll = () => {
    setSelectedRecipients(filteredRecipients.map(r => r.id));
  };

  const deselectAll = () => {
    setSelectedRecipients([]);
  };

  const removeRecipient = (recipientId: string) => {
    setSelectedRecipients(prev => prev.filter(id => id !== recipientId));
  };

  const handleImageUpload = async (file: File) => {
    try {
      const fileName = `email-attachments/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('email-attachments')
        .upload(fileName, file, {
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('email-attachments')
        .getPublicUrl(fileName);

      setAttachedImageUrl(publicUrl);
      setAttachedImage(file);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  const removeImage = () => {
    setAttachedImage(null);
    setAttachedImageUrl("");
  };

  const sendEmails = async () => {
    if (!subject || !body || selectedRecipients.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in subject, body, and select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedRecipientsData = recipients.filter(r => 
        selectedRecipients.includes(r.id)
      );

      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          subject,
          body,
          recipients: selectedRecipientsData,
          attachedImageUrl,
          linkUrl,
          linkText
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Email sent to ${selectedRecipients.length} recipients`,
      });

      // Reset form
      setSubject("");
      setBody("");
      setAttachedImage(null);
      setAttachedImageUrl("");
      setLinkUrl("");
      setLinkText("");
      setRecipientFilter("");
      setRecipients([]);
      setSelectedRecipients([]);
      setSearchTerm("");
    } catch (error) {
      console.error("Error sending emails:", error);
      toast({
        title: "Error",
        description: "Failed to send emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Email Sender</h1>
        <p className="text-muted-foreground">
          Send emails to filtered groups of users
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
              />
            </div>
            
            <div>
              <Label htmlFor="body">Message Body</Label>
              <p className="text-sm text-muted-foreground mb-2">
                You can use {"{name}"} to personalize with recipient names. Format your message with bold, italics, bullet points, and more.
              </p>
              <div className="border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={body}
                  onChange={setBody}
                  placeholder="Enter your message here... You can use {name} to personalize with recipient names."
                  style={{ 
                    backgroundColor: 'hsl(var(--background))',
                    minHeight: '200px'
                  }}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      [{ 'color': [] }, { 'background': [] }],
                      ['clean']
                    ],
                    clipboard: {
                      matchVisual: false
                    }
                  }}
                  formats={[
                    'header', 'bold', 'italic', 'underline',
                    'list', 'bullet', 'link', 'color', 'background'
                  ]}
                />
              </div>
            </div>

            {/* Image Attachment Section */}
            <div>
              <Label>Attach Image</Label>
              <div className="space-y-2">
                {!attachedImage ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Mail className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload an image for your email
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <img 
                      src={attachedImageUrl} 
                      alt="Attached" 
                      className="w-12 h-12 object-cover rounded"
                    />
                    <span className="flex-1 text-sm">{attachedImage.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Link Section */}
            <div className="space-y-3">
              <Label>Add Link (Optional)</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  placeholder="Link URL (e.g., https://example.com)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Input
                  placeholder="Link text (e.g., Visit our website)"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipient Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipients ({selectedRecipients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="filter">Filter Recipients</Label>
              <Select value={recipientFilter} onValueChange={handleFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creators">Creators Only</SelectItem>
                  <SelectItem value="event_registered">Event Registered Users</SelectItem>
                  <SelectItem value="unsubscribed">Non-Subscribers</SelectItem>
                  <SelectItem value="all_users">All Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingRecipients && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading recipients...</span>
              </div>
            )}

            {recipients.length > 0 && (
              <div className="space-y-2">
                {/* Search input */}
                <div>
                  <Label htmlFor="search">Search Recipients</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    disabled={filteredRecipients.length === 0 || selectedRecipients.length === filteredRecipients.length}
                  >
                    Select All {searchTerm && `(${filteredRecipients.length})`}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                    disabled={selectedRecipients.length === 0}
                  >
                    Deselect All
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-2">
                  {filteredRecipients.length === 0 && searchTerm ? (
                    <p className="text-center text-muted-foreground py-4">
                      No recipients found matching "{searchTerm}"
                    </p>
                  ) : (
                    filteredRecipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted rounded-sm"
                      >
                        <Checkbox
                          checked={selectedRecipients.includes(recipient.id)}
                          onCheckedChange={() => toggleRecipient(recipient.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {recipient.display_name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {recipient.email}
                          </p>
                        </div>
                        {recipient.role && (
                          <Badge variant="secondary" className="text-xs">
                            {recipient.role}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedRecipients.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Recipients ({selectedRecipients.length})</Label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 border rounded-md">
                  {selectedRecipients.map((id) => {
                    const recipient = recipients.find(r => r.id === id);
                    if (!recipient) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="flex items-center gap-1 text-xs"
                      >
                        {recipient.display_name}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeRecipient(id)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Ready to send to {selectedRecipients.length} recipients
              </p>
            </div>
            <Button
              onClick={sendEmails}
              disabled={loading || !subject || !body || selectedRecipients.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "Sending..." : "Send Emails"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBulkEmail;