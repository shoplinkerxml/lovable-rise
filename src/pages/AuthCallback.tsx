import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuthService } from "@/lib/user-auth-service";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/providers/i18n-provider";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Handling authentication callback...');
        
        // Check if this is a password reset callback
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        
        if (type === 'recovery') {
          console.log('Password reset callback detected, redirecting to reset page');
          navigate('/user-reset-password');
          return;
        }
        
        const { user, session, error } = await UserAuthService.handleOAuthCallback();
        
        if (error === 'redirect_to_admin') {
          toast.success(t("welcome_back"));
          navigate("/admin");
          return;
        }
        
        if (error === 'oauth_callback_failed') {
          toast.error(t("oauth_failed"));
          navigate("/user-auth");
          return;
        }
        
        if (error === 'profile_creation_failed') {
          toast.error(t("account_confirmed_setup_failed"));
          navigate("/user-auth");
          return;
        }
        
        if (error) {
          console.error('Auth callback error:', error);
          toast.error(t("auth_failed"));
          navigate("/user-auth");
          return;
        }

        if (user && session) {
          // Check if this is coming from email confirmation
          const isEmailConfirmation = window.location.search.includes('type=signup');
          
          if (isEmailConfirmation) {
            toast.success(t("email_confirmed_welcome"));
          } else {
            toast.success(t("welcome_back"));
          }
          navigate("/user/dashboard");
        } else {
          // Handle case where user confirmed email but profile wasn't created
          // This can happen if the database trigger failed
          toast.success(t("email_confirmed"));
          toast.info(t("please_sign_in_complete_registration"));
          navigate("/user-auth");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error(t("auth_failed"));
        navigate("/user-auth");
      }
    };

    handleCallback();
  }, [navigate, t]);

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
          <p className="text-sm text-muted-foreground">
            This may take a moment if you're confirming your email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
