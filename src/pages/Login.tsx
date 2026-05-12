import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { loginUser } from "@/integrations/authApi";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useProfileContext } from "@/contexts/ProfileContext";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshProfile } = useProfileContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  // Check for remembered email and auto-redirect if authenticated
  useEffect(() => {
    const checkRememberedSession = async () => {
      try {
        // Check if user chose "remember me" previously
        const rememberMeFlag = localStorage.getItem("rememberMe");
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        
        if (rememberMeFlag === "true" && rememberedEmail) {
          // Auto-populate email field
          setValue("email", rememberedEmail);
          setValue("rememberMe", true);
          
          // Verify if still authenticated
          const { verifyAuth } = await import("@/integrations/authApi");
          const result = await verifyAuth();
          
          if (result.success) {
            // User is still authenticated, redirect to dashboard
            navigate("/reports");
            return;
          } else {
            // Clear remember me data if no longer authenticated
            localStorage.removeItem("rememberMe");
            localStorage.removeItem("rememberedEmail");
            localStorage.removeItem("user");
          }
        } else if (rememberedEmail) {
          // Just populate the email even if remember me wasn't checked
          setValue("email", rememberedEmail);
        }
      } catch (error) {
        console.error("Error checking remembered session:", error);
      }
    };

    checkRememberedSession();
  }, [setValue, navigate]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginUser(data.email, data.password);
      // const result = await loginUser(data.email);

      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }

      // Token is now stored in HTTP-only cookie by backend
      // Only store user info for frontend display
      localStorage.setItem("user", JSON.stringify(result.user));
      
      if (data.rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", data.email);
      } else {
        // Clear remember me data if user didn't check it
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
      }

      // 🔧 ADD THIS: Force profile refresh and cache
      await refreshProfile();
      console.log("🔧 Profile refreshed and cached after login");

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });

      navigate("/reports");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      {/* Theme Toggle in top-right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Sign in
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field - commented out for email-only authentication */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
                  className="absolute right-0 top-0 h-full px-3 py-2"
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
              {errors.password && (
                <p id="password-error" className="text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => {
                  setValue("rememberMe", !!checked);
                }}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">
              Don't have an account?{" "}
            </span>
            <Link
              to="/register"
              className="text-sm text-primary hover:underline"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
