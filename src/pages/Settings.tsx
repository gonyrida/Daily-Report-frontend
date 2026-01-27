import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import HierarchicalSidebar from "@/components/HierarchicalSidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import ContactSupportModal from "@/components/ContactSupportModal";
import FeedbackSection from "@/components/FeedbackSection";
import LoginHistorySection from "@/components/LoginHistorySection";
import LogoutAllDevicesModal from "@/components/LogoutAllDevicesModal";
import PasswordManagementSection from "@/components/PasswordManagementSection";
import AccountStatusSection from "@/components/AccountStatusSection";
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
  Loader2,
  Check,
  HelpCircle,
  Search,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getUserPreferences, updateUserPreferences, sendTestEmail, type UserPreferences } from "@/lib/notificationUtils";

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
    autoSave: true,
    dataSharing: false,
    marketingEmails: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
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

  // Load preferences from API or localStorage
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        console.log("Loading user preferences...");
        
        // Temporarily use localStorage only to test the page
        const stored = localStorage.getItem('userPreferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("Using stored preferences:", parsed);
          setPreferences(parsed);
        } else {
          // Set default preferences
          const defaultPrefs = {
            emailNotifications: true,
            autoSave: true,
            dataSharing: false,
            marketingEmails: false,
          };
          console.log("Using default preferences:", defaultPrefs);
          setPreferences(defaultPrefs);
          localStorage.setItem('userPreferences', JSON.stringify(defaultPrefs));
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
        
      } catch (error) {
        console.error('Failed to load preferences:', error);
        // Set default preferences on error
        setPreferences({
          emailNotifications: true,
          autoSave: true,
          dataSharing: false,
          marketingEmails: false,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, []);

  // Save preferences to API
  const savePreferences = async () => {
    setIsSaving(true);
    try {
      // Temporarily save to localStorage only
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
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

  // Handle test email
  const handleTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      // Temporarily show success message without API call
      toast({
        title: "Test Email",
        description: "Email functionality will be available when backend is running.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingTestEmail(false);
    }
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <HierarchicalSidebar />
        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/data-[collapsible=icon]:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Settings
              </h1>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-6">
            {/* Appearance Section */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Appearance
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Personalize your visual experience
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold text-foreground">Theme</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose your preferred color scheme
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div 
                      className={`
                        relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:scale-105
                        ${theme === 'light' 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg' 
                          : 'border-muted bg-background hover:border-muted-foreground/20'
                        }
                      `}
                      onClick={() => handleThemeChange('light')}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-lg bg-white shadow-sm border">
                          <Sun className="h-5 w-5 text-yellow-500" />
                        </div>
                        <span className="text-sm font-medium">Light</span>
                        {theme === 'light' && (
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div 
                      className={`
                        relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:scale-105
                        ${theme === 'dark' 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 shadow-lg' 
                          : 'border-muted bg-background hover:border-muted-foreground/20'
                        }
                      `}
                      onClick={() => handleThemeChange('dark')}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-900 shadow-sm border">
                          <Moon className="h-5 w-5 text-blue-300" />
                        </div>
                        <span className="text-sm font-medium">Dark</span>
                        {theme === 'dark' && (
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div 
                      className={`
                        relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:scale-105
                        ${theme === 'system' 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950 shadow-lg' 
                          : 'border-muted bg-background hover:border-muted-foreground/20'
                        }
                      `}
                      onClick={() => handleThemeChange('system')}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 shadow-sm border">
                          <Monitor className="h-5 w-5 text-green-600" />
                        </div>
                        <span className="text-sm font-medium">System</span>
                        {theme === 'system' && (
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-muted">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      {theme === 'system' 
                        ? "Automatically follows your device's appearance settings" 
                        : `Theme is set to ${theme} mode`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Section */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                      Notifications
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                      Manage your alert preferences and communication
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {[
                    {
                      id: 'email-notifications',
                      title: 'Email Notifications',
                      description: 'Receive updates about your reports and account activity',
                      icon: '📧',
                      checked: preferences.emailNotifications,
                      onChange: (checked) => handlePreferenceChange('emailNotifications', checked),
                      action: preferences.emailNotifications ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTestEmail}
                          disabled={isSendingTestEmail}
                          className="ml-2"
                        >
                          {isSendingTestEmail ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send Test'
                          )}
                        </Button>
                      ) : null
                    },
                    {
                      id: 'auto-save',
                      title: 'Auto-save',
                      description: 'Automatically save your work every few minutes',
                      icon: '💾',
                      checked: preferences.autoSave,
                      onChange: (checked) => handlePreferenceChange('autoSave', checked)
                    }
                  ].map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-2xl">{item.icon}</div>
                        <div className="flex-1">
                          <Label htmlFor={item.id} className="text-base font-semibold cursor-pointer">
                            {item.title}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={item.id}
                          checked={item.checked}
                          onCheckedChange={item.onChange}
                          className="scale-110"
                        />
                        {item.action}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Password Management Section */}
            <PasswordManagementSection />

            {/* Login History Section */}
            <LoginHistorySection 
              userId={user?.id}
            />

            {/* Feedback Section */}
            <FeedbackSection 
              userId={user?.id}
              userEmail={user?.email}
            />

            {/* Account Status Section */}
            <AccountStatusSection 
              userId={user?.id}
              userEmail={user?.email}
            />

            {/* Save Button */}
            {hasChanges && (
              <div className="fixed bottom-6 right-6 z-50">
                <Button 
                  onClick={savePreferences} 
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-lg min-w-40"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
