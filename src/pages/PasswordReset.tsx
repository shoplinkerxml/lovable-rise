import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TrendingUp, Lock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { UserAuthService } from "@/lib/user-auth-service";
import { updatePasswordSchema, UpdatePasswordData } from "@/lib/user-auth-schemas";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const PasswordReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang, setLang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for access token and type in URL
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<UpdatePasswordData>({
    resolver: zodResolver(updatePasswordSchema)
  });

  useEffect(() => {
    // Verify we have the required tokens for password reset
    if (!accessToken || !refreshToken || type !== 'recovery') {
      setError("Invalid or missing reset tokens");
      return;
    }

    // Set the session with the tokens
    const setSession = async () => {
      try {
        // This would normally be handled by Supabase automatically
        // but we might need to set the session manually in some cases
        console.log("Password reset tokens received");
      } catch (error) {
        console.error("Error setting session:", error);
        setError("Failed to initialize password reset");
      }
    };

    setSession();
  }, [accessToken, refreshToken, type]);

  const handlePasswordUpdate = async (data: UpdatePasswordData) => {
    setLoading(true);
    setError(null);

    try {
      const { success: updateSuccess, error: updateError } = await UserAuthService.updatePassword(data.password);
      
      if (updateError) {
        setError(t(updateError as any) || "Failed to update password");
        toast.error(t(updateError as any) || "Failed to update password");
        return;
      }

      if (updateSuccess) {
        setSuccess(true);
        toast.success("Password updated successfully");
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate("/user-auth");
        }, 3000);
      }
    } catch (error) {
      console.error("Password update error:", error);
      const errorMessage = "Failed to update password";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // If we don't have the required tokens, show error state
  if (error && !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-red-900">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/user-auth")}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Language Toggle */}
      <div className="absolute right-4 top-4 md:right-8 md:top-8 z-10">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => setLang(lang === "uk" ? "en" : "uk")}
          className="text-emerald-700 hover:bg-emerald-50"
        >
          {lang === "uk" ? "EN" : "UA"}
        </Button>
      </div>

      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            {/* Logo */}
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">MarketGrow</span>
            </div>

            {success ? (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-green-900">Password Updated!</CardTitle>
                <CardDescription>
                  Your password has been successfully updated. You will be redirected to login shortly.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <Lock className="h-6 w-6" />
                </div>
                <CardTitle>{t("reset_title")}</CardTitle>
                <CardDescription>
                  Enter your new password below
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  Redirecting to login in 3 seconds...
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/user-auth")}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Login Now
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(handlePasswordUpdate)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder={t("password_placeholder")}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">
                      {t(errors.password.message as any) || errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("confirm_password")}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                    placeholder={t("password_placeholder")}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {t(errors.confirmPassword.message as any) || errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>

                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/user-auth")}
                    className="text-sm text-muted-foreground hover:text-emerald-600"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {t("back_to_login")}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;