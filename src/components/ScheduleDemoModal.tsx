import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScheduleDemoModal = ({ isOpen, onClose }: ScheduleDemoModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    church: "",
    role: "",
    teamSize: "",
    preferredTime: "",
    date: "",
    message: ""
  });

  const timeSlots = [
    "9:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM", 
    "11:00 AM - 12:00 PM",
    "1:00 PM - 2:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM"
  ];

  const teamSizes = [
    "Just me",
    "2-5 people",
    "6-15 people",
    "16-50 people",
    "50+ people"
  ];

  const roles = [
    "Worship Leader",
    "Music Director",
    "Pastor",
    "Volunteer Musician",
    "Administrator",
    "Other"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate demo scheduling
    setTimeout(() => {
      setIsScheduled(true);
      setIsLoading(false);
      toast({
        title: "Demo Scheduled!",
        description: "We'll send you a calendar invitation shortly.",
      });
    }, 1500);
  };

  if (isScheduled) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md text-center" aria-describedby="demo-scheduled-description">
          <div className="py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <DialogTitle className="text-2xl font-bold text-primary mb-4">
              Demo Scheduled!
            </DialogTitle>
            <p id="demo-scheduled-description" className="text-muted-foreground mb-6">
              Thank you for your interest in WorshipFlow. We've scheduled your personalized demo and will send you a calendar invitation shortly.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground mb-6">
              <p><strong>Date:</strong> {formData.date}</p>
              <p><strong>Time:</strong> {formData.preferredTime}</p>
              <p><strong>Duration:</strong> 30 minutes</p>
            </div>
            <Button onClick={onClose} className="w-full">
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="schedule-demo-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Schedule Your Personal Demo
          </DialogTitle>
          <p id="schedule-demo-description" className="text-muted-foreground">
            Get a personalized walkthrough of WorshipFlow tailored to your church's needs
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Arrangely"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@church.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="church">Church/Organization</Label>
              <Input
                id="church"
                value={formData.church}
                onChange={(e) => setFormData({...formData, church: e.target.value})}
                placeholder="Grace Community Church"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Your Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamSize" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Size
            </Label>
            <Select value={formData.teamSize} onValueChange={(value) => setFormData({...formData, teamSize: value})}>
              <SelectTrigger>
                <SelectValue placeholder="How many people are on your worship team?" />
              </SelectTrigger>
              <SelectContent>
                {teamSizes.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Preferred Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Preferred Time *
              </Label>
              <Select value={formData.preferredTime} onValueChange={(value) => setFormData({...formData, preferredTime: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Questions or Special Requests</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Tell us about your current workflow challenges or specific features you'd like to see..."
              className="min-h-[80px]"
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">What to expect in your demo:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 30-minute personalized walkthrough</li>
              <li>• Live demo of key features for your workflow</li>
              <li>• Q&A session tailored to your needs</li>
              <li>• Custom recommendations for your team</li>
              <li>• No pressure - just helpful insights</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-worship hover:opacity-90"
            disabled={isLoading || !formData.name || !formData.email || !formData.role || !formData.date || !formData.preferredTime}
          >
            {isLoading ? "Scheduling Demo..." : "Schedule My Demo"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleDemoModal;