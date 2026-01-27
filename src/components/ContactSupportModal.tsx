import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mail,
  Send,
  Paperclip,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Bug,
  HelpCircle,
  User,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SupportTicket {
  subject: string;
  category: string;
  message: string;
  attachment?: File;
  priority: string;
}

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactSupportModal: React.FC<ContactSupportModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<SupportTicket>({
    subject: "",
    category: "",
    message: "",
    priority: "medium"
  });
  
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<SupportTicket>>({});

  const categories = [
    { value: "technical", label: "Technical Issue", icon: Bug },
    { value: "account", label: "Account Problem", icon: User },
    { value: "feature", label: "Feature Request", icon: FileText },
    { value: "security", label: "Security Concern", icon: Shield },
    { value: "general", label: "General Question", icon: HelpCircle }
  ];

  const priorities = [
    { value: "low", label: "Low - General inquiry" },
    { value: "medium", label: "Medium - Need assistance" },
    { value: "high", label: "High - Urgent issue" },
    { value: "critical", label: "Critical - System down" }
  ];

  const handleInputChange = (field: keyof SupportTicket, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Attachment must be less than 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image, PDF, or document file.",
          variant: "destructive",
        });
        return;
      }

      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SupportTicket> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create form data for file upload
      const submitData = new FormData();
      submitData.append('subject', formData.subject);
      submitData.append('category', formData.category);
      submitData.append('message', formData.message);
      submitData.append('priority', formData.priority);
      
      if (attachment) {
        submitData.append('attachment', attachment);
      }

      // Send to backend API
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        credentials: 'include',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit support request');
      }

      const result = await response.json();

      toast({
        title: "Support Request Submitted",
        description: `Ticket #${result.ticketId} has been created. We'll respond within 24 hours.`,
      });

      // Reset form
      setFormData({
        subject: "",
        category: "",
        message: "",
        priority: "medium"
      });
      setAttachment(null);
      setErrors({});
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onClose();

    } catch (error) {
      console.error('Support submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Unable to submit your request. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResponseTime = () => {
    switch (formData.priority) {
      case "critical":
        return "1-2 hours";
      case "high":
        return "4-6 hours";
      case "medium":
        return "12-24 hours";
      case "low":
        return "24-48 hours";
      default:
        return "12-24 hours";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Support
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Response Time Notice */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Response Time:</strong> {getResponseTime()} 
              {formData.priority === 'critical' && (
                <span className="ml-2 text-red-600 font-semibold">• Priority Support</span>
              )}
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {category.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Brief description of your issue"
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && (
                <p className="text-sm text-red-500">{errors.subject}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, and what you expected to happen."
                rows={6}
                className={errors.message ? "border-red-500" : ""}
              />
              <div className="flex justify-between">
                {errors.message && (
                  <p className="text-sm text-red-500">{errors.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.message.length}/1000 characters
                </p>
              </div>
            </div>

            {/* Attachment */}
            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment (Optional)</Label>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="attachment"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {attachment ? attachment.name : "Choose File"}
                </Button>
                
                {attachment && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate">{attachment.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAttachment}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Max file size: 10MB. Allowed formats: Images, PDF, Word documents, and text files.
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactSupportModal;
