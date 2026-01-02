import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^a-zA-Z0-9]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[a-z]/.test(pwd)) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 12.5;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 12.5;
    return strength;
  };

  const strength = getStrength(password);
  const getColor = () => {
    if (strength < 25) return "bg-red-500";
    if (strength < 50) return "bg-orange-500";
    if (strength < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getLabel = () => {
    if (strength < 25) return "Very Weak";
    if (strength < 50) return "Weak";
    if (strength < 75) return "Fair";
    if (strength < 100) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Password Strength</span>
        <span
          className={
            strength >= 75
              ? "text-green-600"
              : strength >= 50
              ? "text-yellow-600"
              : "text-red-600"
          }
        >
          {getLabel()}
        </span>
      </div>
      <Progress value={strength} className="h-2" />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center space-x-1">
          {password.length >= 8 ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <X className="h-3 w-3 text-red-500" />
          )}
          <span>8+ characters</span>
        </div>
        <div className="flex items-center space-x-1">
          {/[a-z]/.test(password) ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <X className="h-3 w-3 text-red-500" />
          )}
          <span>Lowercase</span>
        </div>
        <div className="flex items-center space-x-1">
          {/[A-Z]/.test(password) ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <X className="h-3 w-3 text-red-500" />
          )}
          <span>Uppercase</span>
        </div>
        <div className="flex items-center space-x-1">
          {/[0-9]/.test(password) ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <X className="h-3 w-3 text-red-500" />
          )}
          <span>Number</span>
        </div>
        <div className="flex items-center space-x-1 col-span-2">
          {/[^a-zA-Z0-9]/.test(password) ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <X className="h-3 w-3 text-red-500" />
          )}
          <span>Special character</span>
        </div>
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch("password", "");

  // useEffect(() => {
  //   if (!token) {
  //     setError("Invalid reset link. No token provided.");
  //     setTokenValid(false);
  //     return;
  //   }

  //   // Verify token
  //   const verifyToken = async () => {
  //     try {
  //       const response = await fetch("http://localhost:5000/api/auth/verify", {
  //         method: "GET",
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });

  //       if (response.ok) {
  //         setTokenValid(true);
  //       } else {
  //         setTokenValid(false);
  //         setError("Invalid or expired reset link.");
  //       }
  //     } catch (err) {
  //       setTokenValid(false);
  //       setError("Failed to verify reset link.");
  //     }
  //   };

  //   verifyToken();
  // }, [token]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError("Invalid reset link.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("1000000000000000000000000");
      const response = await fetch(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword: data.password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to reset password");
      }

      toast({
        title: "Password reset successful",
        description:
          "Your password has been updated. You can now sign in with your new password.",
      });

      navigate("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // if (tokenValid === false) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  //       <Card className="w-full max-w-md">
  //         <CardHeader className="space-y-1">
  //           <CardTitle className="text-2xl font-bold text-center">
  //             Invalid Link
  //           </CardTitle>
  //           <CardDescription className="text-center">
  //             This password reset link is invalid or has expired.
  //           </CardDescription>
  //         </CardHeader>
  //         <CardContent className="text-center space-y-4">
  //           <Alert variant="destructive">
  //             <AlertDescription>{error}</AlertDescription>
  //           </Alert>
  //           <Button
  //             onClick={() => navigate("/forgot-password")}
  //             className="w-full"
  //           >
  //             Request New Reset Link
  //           </Button>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

  // if (tokenValid === null) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="text-center">
  //         <Loader2 className="mx-auto h-8 w-8 animate-spin" />
  //         <p className="mt-2 text-sm text-gray-600">Verifying reset link...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {password && <PasswordStrengthIndicator password={password} />}
              {errors.password && (
                <p id="password-error" className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  {...register("confirmPassword")}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={
                    errors.confirmPassword ? "confirmPassword-error" : undefined
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
