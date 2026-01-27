import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { 
  Settings as SettingsIcon,
  Monitor,
  Sun,
  Moon,
  Bell,
  Lock,
  User,
  Trash2,
  LogOut,
  ArrowLeft,
  Loader2,
  Check,
  HelpCircle,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ContactSupportModal from "@/components/ContactSupportModal";
import FeedbackSection from "@/components/FeedbackSection";
import LoginHistorySection from "@/components/LoginHistorySection";
import LogoutAllDevicesModal from "@/components/LogoutAllDevicesModal";
import PasswordManagementSection from "@/components/PasswordManagementSection";
import AccountStatusSection from "@/components/AccountStatusSection";

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  autoSave: boolean;
  dataSharing: boolean;
  marketingEmails: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    pushNotifications: false,
    autoSave: true,
    dataSharing: false,
    marketingEmails: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      id: "1",
      question: "How do I change my theme?",
      answer: "You can change your theme in the Appearance section above. Choose between Light, Dark, or System theme. The System theme automatically follows your device's appearance settings.",
      category: "Appearance",
      views: 45
    },
    {
      id: "2", 
      question: "What is the difference between Light and Dark themes?",
      answer: "Light theme provides a clean, bright interface suitable for daytime use, while Dark theme reduces eye strain in low-light conditions. Your preference is automatically saved and applied across all your sessions.",
      category: "Appearance",
      views: 32
    },
    {
      id: "3",
      question: "How do I enable email notifications?",
      answer: "Navigate to the Notifications section and toggle the 'Email Notifications' switch. You'll receive updates about your account activity, report submissions, and important announcements.",
      category: "Notifications",
      views: 28
    },
    {
      id: "4",
      question: "Can I customize what notifications I receive?",
      answer: "Yes! You can control email notifications, push notifications, and marketing emails separately. Each option can be enabled or disabled based on your preferences.",
      category: "Notifications", 
      views: 19
    },
    {
      id: "5",
      question: "How does auto-save work?",
      answer: "When auto-save is enabled, your work is automatically saved as you type. This prevents data loss if you accidentally close your browser or experience connection issues. You can toggle this in the Privacy & Security section.",
      category: "Privacy",
      views: 35
    },
    {
      id: "6",
      question: "Is my data secure?",
      answer: "Yes, we take data security seriously. All data is encrypted in transit and at rest. You can control data sharing settings in the Privacy & Security section, and we never share your personal information without your consent.",
      category: "Privacy",
      views: 52
    },
    {
      id: "7",
      question: "How do I delete my account?",
      answer: "You can delete your account from the Account Actions section at the bottom of this page. Please note that this action is permanent and cannot be undone. We recommend downloading any important data before proceeding.",
      category: "Account",
      views: 15
    },
    {
      id: "8",
      question: "Can I change my password?",
      answer: "Yes, you can change your password by clicking 'Change Password' in the Account Actions section. We recommend using a strong, unique password and enabling two-factor authentication for additional security.",
      category: "Account",
      views: 23
    }
  ]);

  // Load preferences from localStorage or API
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const stored = localStorage.getItem('userPreferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences(parsed);
        }

        // Load user data for feedback
        try {
          const response = await fetch('/api/auth/profile', {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.data);
          }
        } catch (userError) {
          console.log('Could not load user data, feedback will be anonymous');
        }
        
        // In a real app, you'd fetch from API here
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, []);

  // Save preferences to localStorage and API
  const savePreferences = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      // In a real app, you'd save to API here
      
      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle preference changes
  const handlePreferenceChange = (key: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast({
      title: "Theme Updated",
      description: `Theme changed to ${newTheme}.`,
    });
  };

  // Handle logout
  const handleLogout = () => {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Navigate to login
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      });

      // Clear all data and redirect
      localStorage.clear();
      navigate('/login');

    } catch (error) {
      console.error('Delete account error:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle FAQ view tracking
  const handleFAQClick = (faqId: string) => {
    setFaqs(prev => prev.map(faq => 
      faq.id === faqId ? { ...faq, views: faq.views + 1 } : faq
    ));
    
    // In a real app, you'd send this to analytics backend
    console.log(`FAQ viewed: ${faqId}`);
  };

  // Filter FAQs based on search
  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences</p>
            </div>
          </div>
          
          {hasChanges && (
            <Button onClick={savePreferences} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
        </div>

        <div className="space-y-8">
          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose your preferred color scheme
                </p>
                
                <RadioGroup 
                  value={theme} 
                  onValueChange={handleThemeChange}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="light" id="light" />
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <div>
                        <Label htmlFor="light" className="font-medium cursor-pointer">
                          Light
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Clean and bright interface
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="dark" id="dark" />
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <div>
                        <Label htmlFor="dark" className="font-medium cursor-pointer">
                          Dark
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Easy on the eyes in low light
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="system" id="system" />
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <div>
                        <Label htmlFor="system" className="font-medium cursor-pointer">
                          System
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Follows your device settings
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Control how you receive updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your account activity
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-base font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications for important updates
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-emails" className="text-base font-medium">
                    Marketing Emails
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive emails about new features and updates
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={preferences.marketingEmails}
                  onCheckedChange={(checked) => handlePreferenceChange('marketingEmails', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Manage your privacy settings and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save" className="text-base font-medium">
                    Auto-save
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save your work as you type
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={preferences.autoSave}
                  onCheckedChange={(checked) => handlePreferenceChange('autoSave', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-sharing" className="text-base font-medium">
                    Data Sharing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Share anonymous usage data to help improve the service
                  </p>
                </div>
                <Switch
                  id="data-sharing"
                  checked={preferences.dataSharing}
                  onCheckedChange={(checked) => handlePreferenceChange('dataSharing', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Help & FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Help
              </CardTitle>
              <CardDescription>
                Frequently asked questions and support resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* FAQ Accordion */}
              <Accordion type="multiple" className="space-y-2">
                {filteredFAQs.length > 0 ? (
                  filteredFAQs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                      <AccordionTrigger 
                        className="text-left hover:no-underline"
                        onClick={() => handleFAQClick(faq.id)}
                      >
                        <div className="flex items-center justify-between w-full pr-2">
                          <span className="font-medium">{faq.question}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {faq.category}
                            </span>
                            {faq.views > 30 && (
                              <span className="text-xs text-orange-600">
                                Popular
                              </span>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                        <div className="mt-3 text-xs text-muted-foreground">
                          Viewed {faq.views} times
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No FAQs found matching your search.</p>
                    <p className="text-sm">Try different keywords or browse all questions.</p>
                  </div>
                )}
              </Accordion>

              {/* Additional Help */}
              <Separator />
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Still need help?
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowContactSupport(true)}
                  >
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <FeedbackSection 
            userId={user?.id}
            userEmail={user?.email}
          />

          {/* Login History Section */}
          <LoginHistorySection 
            userId={user?.id}
          />

          {/* Password Management Section */}
          <PasswordManagementSection />

          {/* Account Status Section */}
          <AccountStatusSection 
            userId={user?.id}
            userEmail={user?.email}
          />
        </div>
      </div>

      {/* Contact Support Modal */}
      <ContactSupportModal 
        isOpen={showContactSupport}
        onClose={() => setShowContactSupport(false)}
      />

      {/* Logout All Devices Modal */}
      <LogoutAllDevicesModal 
        isOpen={showLogoutAllModal}
        onClose={() => setShowLogoutAllModal(false)}
        includeCurrent={true}
      />
    </div>
  );
};

export default Settings;
