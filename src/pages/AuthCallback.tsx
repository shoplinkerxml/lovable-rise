import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuthService } from "@/lib/user-auth-service";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { user, session, error } = await UserAuthService.handleOAuthCallback();
        
        if (error === 'redirect_to_admin') {
          toast.success("Welcome back!");
          navigate("/admin");
          return;
        }
        
        if (error === 'oauth_callback_failed') {
          toast.error("Authentication failed. Please try again.");
          navigate("/login");
          return;
        }
        
        if (error) {
          toast.error("Authentication failed. Please try again.");
          navigate("/login");
          return;
        }

        if (user && session) {
          toast.success("Welcome to MarketGrow!");
          navigate("/user/dashboard");
        } else {
          toast.error("Authentication failed. Please try again.");
          navigate("/login");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error("Authentication failed. Please try again.");
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h2 className="text-xl font-semibold">Completing Authentication</h2>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Spinner className="mx-auto" />
          <p className="text-muted-foreground">
            Please wait while we complete your authentication...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;