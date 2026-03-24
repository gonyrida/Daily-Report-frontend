import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { verifyAuth } from "@/integrations/authApi";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallbackPath = "/login" 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const result = await verifyAuth();
        
        if (!isMounted) return;
        
        if (result.success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          toast({
            title: "Authentication Required",
            description: "Please login to access this page",
            variant: "destructive",
          });
          navigate(fallbackPath);
        }
      } catch (error) {
        if (!isMounted) return;
        
        setIsAuthenticated(false);
        toast({
          title: "Authentication Error",
          description: "Failed to verify authentication",
          variant: "destructive",
        });
        navigate(fallbackPath);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate, toast, fallbackPath]);

  // CRITICAL: Show loading until auth is confirmed
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only render children if auth is confirmed
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Fallback (should redirect, but just in case)
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-gray-600">Please login to access this page.</p>
      </div>
    </div>
  );
};

export default ProtectedRoute;
