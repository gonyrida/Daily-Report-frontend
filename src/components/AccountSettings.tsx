// src/components/AccountSettings.tsx
// Account settings component for advanced account management

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, EyeOff, Shield, Bell, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AccountSettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  profileVisibility: boolean;
  twoFactorAuth: boolean;
}

const AccountSettings = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<AccountSettings>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    emailNotifications: true,
    pushNotifications: false,
    profileVisibility: true,
    twoFactorAuth: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch account settings on mount
  useEffect(() => {
    fetchAccountSettings();
  }, []);

  const fetchAccountSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/user/account-settings", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          emailNotifications: data.emailNotifications ?? true,
          pushNotifications: data.pushNotifications ?? false,
          profileVisibility: data.profileVisibility ?? true,
          twoFactorAuth: data.twoFactorAuth ?? false,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch account settings:", error);
      toast({
        title: "Error",
        description: "Failed to load account settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validatePasswordChange = () => {
    const newErrors: Record<string, string> = {};

    if (settings.currentPassword && !settings.newPassword) {
      newErrors.newPassword = "New password is required when current password is provided";
    }

    if (settings.newPassword) {
      if (settings.newPassword.length < 8) {
        newErrors.newPassword = "Password must be at least 8 characters";
      }
      if (settings.newPassword !== settings.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveSettings = async () => {
    if (!validatePasswordChange()) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch("/api/user/account-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          profileVisibility: settings.profileVisibility,
          twoFactorAuth: settings.twoFactorAuth,
          ...(settings.newPassword && {
            currentPassword: settings.currentPassword,
            newPassword: settings.newPassword,
          }),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Account settings updated successfully",
        });
        
        // Clear password fields after successful update
        setSettings(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update settings");
      }
    } catch (error) {
      console.error("Failed to save account settings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update account settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof AccountSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (isLoading && !settings.emailNotifications) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Go back to profile"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">Account Settings</h1>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className="min-w-24"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your password and authentication preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Change Password */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Change Password</Label>
                
                <div className="space-y-3">
                  <div className="relative">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showPasswords.current ? "text" : "password"}
                        value={settings.currentPassword}
                        onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                        placeholder="Enter current password"
                        className="pr-10"
                        aria-label="Current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => togglePasswordVisibility("current")}
                        aria-label={showPasswords.current ? "Hide password" : "Show password"}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-sm text-destructive">{errors.currentPassword}</p>
                    )}
                  </div>

                  <div className="relative">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPasswords.new ? "text" : "password"}
                        value={settings.newPassword}
                        onChange={(e) => handleInputChange("newPassword", e.target.value)}
                        placeholder="Enter new password"
                        className="pr-10"
                        aria-label="New password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => togglePasswordVisibility("new")}
                        aria-label={showPasswords.new ? "Hide password" : "Show password"}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-destructive">{errors.newPassword}</p>
                    )}
                  </div>

                  <div className="relative">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={settings.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        placeholder="Confirm new password"
                        className="pr-10"
                        aria-label="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => togglePasswordVisibility("confirm")}
                        aria-label={showPasswords.confirm ? "Hide password" : "Show password"}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => handleInputChange("twoFactorAuth", checked)}
                  aria-label="Enable two-factor authentication"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Control how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your account activity
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleInputChange("emailNotifications", checked)}
                  aria-label="Enable email notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleInputChange("pushNotifications", checked)}
                  aria-label="Enable push notifications"
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Manage your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to other users
                  </p>
                </div>
                <Switch
                  checked={settings.profileVisibility}
                  onCheckedChange={(checked) => handleInputChange("profileVisibility", checked)}
                  aria-label="Make profile visible"
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
