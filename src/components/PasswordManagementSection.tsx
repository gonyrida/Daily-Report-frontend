import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Lock,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
}

const PasswordManagementSection: React.FC = () => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: "Very Weak",
    color: "bg-red-500",
    suggestions: []
  });

  // Password strength calculation
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const suggestions: string[] = [];

    // Length check
    if (password.length >= 8) score += 1;
    else suggestions.push("Use at least 8 characters");

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) suggestions.push("Consider using 12+ characters for better security");

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push("Include lowercase letters");

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push("Include uppercase letters");

    if (/[0-9]/.test(password)) score += 1;
    else suggestions.push("Include numbers");

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else suggestions.push("Include special characters (!@#$%^&*)");

    // Common patterns penalty
    if (/^(.)\1+$/.test(password)) {
      score = Math.max(0, score - 2);
      suggestions.push("Avoid repeating characters");
    }

    if (/123|abc|qwe|password/i.test(password)) {
      score = Math.max(0, score - 1);
      suggestions.push("Avoid common patterns");
    }

    // Determine strength label and color
    let label = "Very Weak";
    let color = "bg-red-500";

    if (score >= 5) {
      label = "Very Strong";
      color = "bg-green-500";
    } else if (score >= 4) {
      label = "Strong";
      color = "bg-green-400";
    } else if (score >= 3) {
      label = "Medium";
      color = "bg-yellow-500";
    } else if (score >= 2) {
      label = "Weak";
      color = "bg-orange-500";
    }

    return {
      score: Math.min(5, score),
      label,
      color,
      suggestions
    };
  };

  // Update password strength when new password changes
  useEffect(() => {
    if (formData.newPassword) {
      setPasswordStrength(calculatePasswordStrength(formData.newPassword));
    } else {
      setPasswordStrength({
        score: 0,
        label: "Very Weak",
        color: "bg-red-500",
        suggestions: []
      });
    }
  }, [formData.newPassword]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Current password validation
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required";
    }

    // New password validation
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long";
    } else if (passwordStrength.score < 3) {
      newErrors.newPassword = "Password is too weak. Please follow the suggestions below.";
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Check if new password is same as current
    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update password');
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed. You may need to log in again on other devices.",
      });

      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setErrors({});
      setPasswordStrength({
        score: 0,
        label: "Very Weak",
        color: "bg-red-500",
        suggestions: []
      });

    } catch (error: any) {
      console.error('Password update error:', error);
      
      let errorMessage = "Failed to update password. Please try again.";
      
      if (error.message.includes('Current password is incorrect')) {
        errorMessage = "Current password is incorrect. Please check and try again.";
        setErrors(prev => ({ ...prev, currentPassword: "Incorrect password" }));
      } else if (error.message.includes('too weak')) {
        errorMessage = "New password is too weak. Please choose a stronger password.";
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.color) {
      case 'bg-red-500': return 'text-red-600';
      case 'bg-orange-500': return 'text-orange-600';
      case 'bg-yellow-500': return 'text-yellow-600';
      case 'bg-green-400': return 'text-green-600';
      case 'bg-green-500': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Password Management
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password *</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                placeholder="Enter your current password"
                className={errors.currentPassword ? "border-red-500" : ""}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('current')}
                disabled={isLoading}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-red-500">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password *</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Enter your new password"
                className={errors.newPassword ? "border-red-500" : ""}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('new')}
                disabled={isLoading}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-red-500">{errors.newPassword}</p>
            )}

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Password Strength</span>
                  <span className={`text-sm font-medium ${getPasswordStrengthColor()}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <Progress 
                  value={(passwordStrength.score / 5) * 100} 
                  className="h-2"
                />
                {passwordStrength.suggestions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Suggestions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {passwordStrength.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm your new password"
                className={errors.confirmPassword ? "border-red-500" : ""}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={isLoading}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Security Tips */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Tips:</strong> Use a unique password with at least 12 characters, including uppercase, lowercase, numbers, and special characters. Avoid using common words or personal information.
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || passwordStrength.score < 3}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PasswordManagementSection;
